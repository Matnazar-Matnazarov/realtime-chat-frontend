# Realtime Chat Frontend

Professional real-time chat application frontend built with React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Redux Toolkit, and Chart.js.

## 🚀 Features

- **Modern Stack**: React 19 + Vite + TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod validation
- **Charts**: Chart.js for admin statistics
- **API Client**: Axios with interceptors and auto token refresh
- **Type Safety**: Full TypeScript support
- **Dark Mode**: Ready for dark mode support

## 📦 Tech Stack

- **React 19** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Chart.js** - Data visualization
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Sonner** - Toast notifications

## 🛠️ Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm type-check

# Lint
pnpm lint
```

## 📁 Project Structure

```
src/
├── components/        # Reusable components
│   ├── ui/          # shadcn/ui components
│   ├── layout/      # Layout components
│   └── features/   # Feature-specific components
├── pages/           # Page components
│   ├── auth/        # Authentication pages
│   ├── chat/        # Chat pages
│   ├── admin/       # Admin pages
│   └── profile/     # Profile pages
├── store/           # Redux store
│   ├── slices/      # Redux slices
│   ├── api/         # RTK Query APIs
│   └── hooks.ts     # Typed Redux hooks
├── services/         # API services
│   ├── api.ts       # Axios instance
│   └── authService.ts
├── hooks/           # Custom React hooks
│   └── useAuth.ts
├── lib/             # Utilities and configs
│   ├── utils.ts     # Utility functions
│   └── chart.ts     # Chart.js config
├── types/           # TypeScript types
├── constants/       # Constants
└── utils/           # Additional utilities
```

## 🔧 Configuration

Create `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000
```

## 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm type-check` - Type check without emitting

## 🎨 Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. Tokens are automatically refreshed when expired.

## 📊 Admin Dashboard

Admin dashboard includes Chart.js visualizations for:
- User growth statistics
- Platform overview
- User activity distribution

## 🎯 Next Steps

1. Implement chat interface with WebSocket
2. Add real-time messaging
3. Implement user search
4. Add group chat functionality
5. Implement file uploads
6. Add notifications