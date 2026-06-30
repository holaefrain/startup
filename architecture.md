# Debrief HTML - Architecture Overview

## Project Description

This is a web-based implementation of the classic Simon memory game, where players repeat sequences of colored button flashes. The project is built as a multi-page HTML application and serves as a learning exercise for web development fundamentals.

## Technologies Used

### Core Technologies

- **HTML5** - Semantic markup for structure and content
- **SVG** - Scalable Vector Graphics for the game's colored button interface
- **Bash** - Deployment automation script

### HTML Features Utilized

- **Semantic HTML Elements**: `<header>`, `<main>`, `<footer>`, `<nav>`, `<menu>`
- **Forms**: User authentication interface with input fields
- **Tables**: Displaying high scores and game button layout
- **SVG Graphics**: Custom-drawn colored buttons using SVG paths
- **Meta Tags**: Viewport configuration for responsive behavior

## Code Structure

### Pages

The application consists of four primary HTML pages:

#### 1. **index.html** - Home/Login Page

- Entry point to the application
- Contains login and registration form
- Email and password input fields
- Links to all other pages via navigation menu

#### 2. **signup.html** - Game Interface

- Main game page with interactive Simon buttons
- Four colored buttons (green, red, blue, yellow) rendered using SVG
- Score display and reset functionality
- Real-time notification list showing other players' activities
- Player name display

#### 3. **discover.html** - High Scores

- Displays leaderboard with top player scores
- Tabular data showing rank, name, score, and date
- Sample data includes international player names

#### 4. **settings.html** - About Page

- Game description and rules
- Educational disclaimer about trademark usage
- Inspirational quote section
- Placeholder for random image

### Common Elements

All pages share consistent structure:

**Header**

- Application title: "Simon®"
- Navigation menu with links to all four pages
- Horizontal rule separator

**Footer**

- Author attribution
- GitHub repository link
- Horizontal rule separator

### File Organization

```
-html/
├── index.html          # Home/login page
├── play.html           # Game interface
├── scores.html         # High scores leaderboard
├── about.html          # About page with game info
├── README.md           # Project documentation
├── notes.md            # Development notes
├── deployFiles.sh      # Deployment script
└── LICENSE             # License file
```

## Design Patterns

### Multi-Page Application (MPA)

The application uses a traditional multi-page architecture where each page is a separate HTML document. Navigation between pages uses standard HTML anchor tags (`<a>`).

### Semantic HTML

The codebase emphasizes semantic HTML5 elements to provide meaningful structure:

- `<menu>` for navigation lists (semantic alternative to `<ul>`)
- `<main>` for primary content
- `<header>` and `<footer>` for page sections

### Static Content

Currently, all content is static HTML with hardcoded data. Notable static features:

- Sample high scores in scores.html
- Hardcoded notification list in play.html
- No external CSS or JavaScript files (pure HTML)

## SVG Button Design

The game interface uses inline SVG to create four distinctive colored buttons:

- **Green Button** (top-left): Quadratic curve from top-right
- **Red Button** (top-right): Quadratic curve from top-left
- **Blue Button** (bottom-left): Quadratic curve from bottom-right
- **Yellow Button** (bottom-right): Quadratic curve from bottom-left

Each button is created using SVG `<path>` elements with quadratic curves (Q command) to create rounded corners.

## Deployment

The project includes a deployment script (`deployFiles.sh`) that:

1. Accepts parameters for SSH key, hostname, and service name
2. Clears previous deployment on the target server
3. Copies all files to the remote server via SCP
4. Deploys to an Ubuntu server in a services directory structure

**Usage:**

```bash
./deployFiles.sh -k <pem-key-file> -h <hostname> -s <service-name>
```

## Current Limitations

As an HTML-only deliverable, the application has several limitations:

- **No Styling**: No CSS, relying on old-style HTML formatting (`<hr>`, `<br>`)
- **No Interactivity**: No JavaScript, buttons are non-functional
- **No Backend**: No server-side logic or data persistence
- **Static Data**: All scores and notifications are hardcoded

## Future Enhancements

Based on the README, future iterations will add:

- **CSS**: Styling, color schemes, and responsive design
- **JavaScript**: Game logic, button interactions, and dynamic content
- **Backend Services**: Node.js/Express server for data persistence
- **Database**: Store user accounts and high scores
- **WebSocket**: Real-time multiplayer notifications
- **Authentication**: Working login/registration system
- **React**: Modern frontend framework integration

## HTML Element Critique

This section analyzes the HTML elements used throughout the codebase, highlighting strengths, weaknesses, and suggesting improvements.