while getopts k:h:s: flag
do
    case "${flag}" in
        k) key=${OPTARG};;
        h) hostname=${OPTARG};;
        s) service=${OPTARG};;
    esac
done

if [[ -z "$key" || -z "$hostname" || -z "$service" ]]; then
    printf "\nMissing required parameter.\n"
    printf "  syntax: deployReact.sh -k <pem key file> -h <hostname> -s <service>\n\n"
    exit 1
fi

printf "\n----> Deploying React bundle $service to $hostname with $key\n"

# Backend: only sync/install/restart server/ if a dry-run itemized diff against the target is non-empty.

# package-lock.json excluded: npm regenerates it remotely, local doesn't track one, so --delete would flag it every run.
RSYNC_EXCLUDES="--exclude dbConfig.json --exclude node_modules --exclude package-lock.json"
printf "\n----> Checking for backend (server/) changes\n"
# grep -v '^\.d' drops directory-only attribute diffs (e.g. mtime), which aren't real content changes.
BACKEND_DIFF=$(rsync -ain --delete $RSYNC_EXCLUDES -e "ssh -i $key" server/ ubuntu@$hostname:services/$service/server/ | grep -v '^\.d')

if [[ -n "$BACKEND_DIFF" ]]; then
    printf "\n----> Backend changes detected:\n%s\n" "$BACKEND_DIFF"

    printf "\n----> Syncing server/ to the target\n"
    rsync -avz --delete $RSYNC_EXCLUDES -e "ssh -i $key" server/ ubuntu@$hostname:services/$service/server/

    printf "\n----> Installing backend dependencies and restarting on the target\n"
    ssh -i "$key" ubuntu@$hostname << ENDSSH
export NVM_DIR="\$HOME/.nvm"
. "\$NVM_DIR/nvm.sh"
cd services/${service}/server
npm install
pm2 restart ${service}
ENDSSH
else
    printf "\n----> No backend changes detected, skipping server sync/restart\n"
fi

# Step 1
printf "\n----> Build the distribution package\n"
rm -rf build
mkdir build
npm install # make sure vite is installed so that we can bundle
npm run build # build the React front end
cp -rf dist/* build # move the React front end to the target distribution

# Step 2
printf "\n----> Clearing out previous distribution on the target\n"
ssh -i "$key" ubuntu@$hostname << ENDSSH
rm -rf services/${service}/public
mkdir -p services/${service}/public
ENDSSH

# Step 3
printf "\n----> Copy the distribution package to the target\n"
scp -r -i "$key" build/* ubuntu@$hostname:services/$service/public

# Step 5
printf "\n----> Removing local copy of the distribution package\n"
rm -rf build
rm -rf dist