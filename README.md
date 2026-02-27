# SketchNotes

A collaborative whiteboard / sketch-note application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma + SQLite**.

## Features

- 🎨 **Canvas drawing** with pen, shapes (rectangle, ellipse, diamond), lines, arrows, and text
- 🔄 **Undo/redo** with full history (up to 50 steps)
- 💾 **Auto-save** to localStorage + manual save to server
- 📤 **Export** as PNG (2x, 4x, transparent) or SVG
- 🔗 **Share links** with read-only or read-write access tokens
- 🔍 **Zoom & pan** with mouse wheel / pinch / hand tool
- 📐 **Grid overlay** toggle
- 🗂 **Board management** — create, rename, duplicate, delete boards

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma |
| ORM | Prisma |
| ID generation | crypto.randomUUID() (built-in) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Database setup

```bash
npx prisma migrate dev --name init
```

### Development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/boards`.

### Build for production

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── boards/           # CRUD for boards
│   │   │   └── [id]/
│   │   │       └── share/    # Share token creation
│   │   └── share/[token]/    # Share token lookup
│   ├── boards/               # Board list page
│   ├── board/[id]/           # Board editor page
│   └── share/[token]/        # Shared board view
├── components/
│   └── canvas/
│       ├── BoardEditor.tsx   # Board loader wrapper
│       ├── CanvasView.tsx    # Main canvas component
│       ├── Toolbar.tsx       # Drawing tool selector
│       └── StylePanel.tsx    # Stroke/fill style controls
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── scene.ts              # Scene state operations
│   └── hash.ts               # Token generation & hashing
├── types/
│   └── scene.ts              # TypeScript types & defaults
├── prisma/
│   └── schema.prisma         # Database schema
└── __tests__/
    └── scene.test.ts         # Unit tests
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `P` | Pen / freedraw |
| `R` | Rectangle |
| `E` | Ellipse |
| `A` | Arrow |
| `T` | Text |
| `H` | Hand / pan |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save to server |
| `Escape` | Deselect |
| `+` / `-` | Zoom in/out |
| `Ctrl+0` | Reset zoom |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/boards` | List boards (supports `?search=`) |
| `POST` | `/api/boards` | Create board |
| `GET` | `/api/boards/:id` | Get board with latest snapshot |
| `PUT` | `/api/boards/:id` | Update title, visibility, or scene |
| `DELETE` | `/api/boards/:id` | Delete board |
| `POST` | `/api/boards/:id/share` | Create share token |
| `GET` | `/api/share/:token` | Resolve share token |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite connection string (e.g. `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Secret key (reserved for future auth integration) |

## License

MIT
