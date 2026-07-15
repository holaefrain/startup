# CS 260 Notes

This file represents what I have learned about web programming.

- [My startup](https://startup.cs260.click)
- [My simon](https://simon.cs260.click)

## Helpful links

- [Course instruction](https://github.com/webprogramming260)
- [Canvas](https://byu.instructure.com)
- [MDN](https://developer.mozilla.org)

## AWS

EC2:
Route53:
Record Keeping:

EC2 Instance OOM Memory Filled?
- SSH into it (ssh -i ~/keys/production.pem ubuntu@32.194.27.92)
- Check memory (free -h)
- 

## HTML

Structure: proper webpage structure should ALWAYS be thought of before anything else. 

index.html
- home + login
- image/visual
- big title + catch

scroll
- elevator pitch
- stats

scroll
- how it works

scroll
- about

scroll
-sign up

footer

sign up.html


## CSS

## JS

## JSX
-  Note on [PARSE_ERROR] Unexpected token:
    - 

## React
*Deploy to Production*
- Build the app (npm run build)
- Push to Production (./deployReact.sh -k ~/keys/production.pem -h startup.debrief.works -s startup)

*Routing*
- With a single page application, the browser only loads one HTML page and then JavaScript is used to manipulate the DOM and give it the appearance of multiple pages. The router defines the routes a user can take through the application, and automatically manipulates the DOM to display the appropriate framework components.

## Chat (planned, currently mocked with local state)

- Match list should look like Hinge: each match shows their photo, name, and a preview of the last message - whether it was sent by me or by them.
- Clicking a match opens the full conversation thread.
- Inside a thread, a "Plan a date" button opens date planning, which calls the Google Maps API server-side for venue suggestions (this part is a normal REST call, not WebSocket).
- Real backend needed: WebSocket for delivering new messages and date-proposal updates live, plus REST endpoints for match list / thread history / sending a message. See architecture.md for the fuller plan.
