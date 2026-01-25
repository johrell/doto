# Doto

A local-first todo app for when you need task management but can't (or won't) store sensitive information in the cloud.

## Why Doto?

I built this for myself. Every todo app wants your data in their cloud, requires an account, or syncs to servers you don't control. That's fine for grocery lists, but not when you're:

- Working with confidential client projects
- Bound by organizational security policies
- Handling sensitive internal tasks
- Simply preferring to keep your data on your machine

Doto runs entirely in your browser. No accounts. No servers. No network requests. Your tasks never leave your computer.

**Free to use** - if you're facing the same hurdles with cloud-everything, help yourself.

## Features

- **Kanban board** with TODO, IN PROGRESS, and DONE columns
- **Drag and drop** tasks between columns
- **Quick-add** with hashtag parsing (`Fix bug #urgent #backend @frontend`)
- **Keywords** (multiple per task) and **Groups** (one per task) for organization
- **Projects** to separate different workstreams
- **Dark/light themes** with a retro terminal aesthetic
- **Keyboard shortcuts** (Enter to quick-add, Escape to close forms)

## How It Works

### Storage

All data lives in your browser's localStorage under these keys:

| Key | Contents |
|-----|----------|
| `doto-tasks` | Your tasks with titles, descriptions, status, dates |
| `doto-projects` | Project definitions and which tasks belong to them |
| `doto-keywords` | Keyword labels with colors |
| `doto-groups` | Group labels with colors |
| `doto-theme` | Your light/dark preference |

Data persists across browser sessions. Clearing your browser data will delete your tasks.

### Architecture

```
src/
├── stores/           # Zustand state management with localStorage persistence
│   ├── taskStore     # Task CRUD, status tracking, ordering
│   ├── projectStore  # Multiple projects support
│   ├── keywordStore  # Tag management
│   └── groupStore    # Group management
│
├── components/       # React UI components
│   ├── Column        # Kanban columns (TODO, IN PROGRESS, DONE)
│   ├── TaskCard      # Individual task display
│   ├── TaskForm      # Create/edit panel with auto-save
│   ├── QuickAddInput # Fast task entry with #keyword @group parsing
│   └── ...           # Selectors, modals, pickers
│
├── types/            # TypeScript definitions
├── hooks/            # useTheme for dark/light mode
└── utils/            # Quick-add parser
```

### Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety throughout
- **Zustand** - Lightweight state management with persist middleware
- **Vite** - Fast development and builds
- **Tailwind CSS** - Styling
- **dnd-kit** - Drag and drop

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Install and Run

```bash
# Clone the repo
git clone https://github.com/johrell/doto.git
cd Doto

# Install dependencies
npm install

# Start development server
npm run dev
```

The app opens at `http://localhost:3000`.

### Build for Production

```bash
# Create optimized build
npm run build

# Preview the build locally
npm run preview
```

The production build outputs to `dist/`. Serve it with any static file server.

## Quick-Add Syntax

Type in the quick-add input at the top of the TODO column:

```
Fix login bug #urgent #backend @api-team
```

- `#keyword` - Adds keyword (creates it if new, with random color)
- `@group` - Assigns to group (must exist)
- Everything else becomes the task title

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Focus quick-add input (when not in a text field) |
| `Escape` | Close task form |

## Data Backup

Since data is in localStorage, you can back it up manually:

1. Open browser DevTools (F12)
2. Go to Application > Local Storage
3. Find the `doto-*` keys
4. Copy the values to a safe location

To restore, paste the values back into the same keys.

## License

Free to use. No warranty. If it helps you manage sensitive work without cloud anxiety, that's the goal.
