# Orange Tools Design Guidelines

## Design Approach
**Reference-Based**: Inspired by modern utility apps like Notion (clean layouts), Linear (typography hierarchy), and Stripe (minimal, focused design). Combined with Orange brand identity for primary theming.

## Core Visual Identity

### Typography Hierarchy
- **Headings**: Bold, large scale for tool titles and section headers
- **Body Text**: Regular weight, optimized for readability in both LTR and RTL
- **Numeric Displays**: Tabular numbers, extra-large size for calculator results and financial values
- **Helper Text**: Small, muted for formulas and explanations

### Layout System
**Spacing Units**: Tailwind spacing of 2, 4, 6, 8, 12, 16, 24 (p-2, m-4, gap-6, etc.)
- **Container**: max-w-7xl with px-6 for consistent page margins
- **Grid Structure**: 12-column grid system; sticky right panel (4 cols) on desktop ≥1024px
- **Card Spacing**: p-6 to p-8 for content cards, gap-4 between elements
- **Section Padding**: py-12 for major sections

### Visual Elements
- **Rounded Corners**: Consistent 2xl (rounded-2xl) for all cards, panels, and major containers
- **Soft Shadows**: Layered shadow-sm to shadow-lg for depth hierarchy
- **Borders**: Subtle border treatments on cards; thicker accent borders for active states

## Theme System

**Four Themes** (persist in localStorage):
1. **Orange (Default)**: Warm, energetic orange accent (#FF6B00 family) with light neutrals
2. **Dark**: Deep backgrounds with high-contrast text, orange accents preserved
3. **Blossom**: Soft pink/purple palette with feminine touch
4. **Mint**: Cool green/teal for refreshing feel

**Implementation**: CSS variables for all color tokens, Tailwind config extension

## Layout Structure

### App Bar (Fixed Top)
- Logo/title "Orange Tools" (left)
- Theme switcher (segmented control, center-right)
- Language toggle AR/EN with flag icons (right)
- "Help" button triggering chatbot (far right)
- Height: h-16, subtle shadow-sm

### Tab Navigation
**Segmented Control Style**: Three equal-width tabs below app bar
- States: Default, Hover (subtle background), Active (accent background, bold text)
- Smooth tab indicator animation (Framer Motion)
- Deep-link support via hash (#calculator, #pro-rata, #assistant)

### Main Content Area
**Desktop (≥1024px)**: 
- Left section (8 cols): Active tab content
- Right section (4 cols): Sticky summary panel with current results, copy buttons

**Mobile (<1024px)**: 
- Full-width stacked layout
- Summary panel becomes collapsible accordion below content

## Component Library

### Calculator Tab Design
**Numeric Keypad**: 
- 4×3 grid layout (gap-2)
- Large touchable buttons (min-height: 3rem)
- Haptic-style press feedback (scale transform)
- Clear button with distinct styling

**Input Display**: 
- Large input field (text-3xl to text-4xl)
- Monospace font for numbers
- Subtle background distinction
- Sync with keypad in real-time

**Result Cards**:
- Grid: 2 cols on mobile, 2×2 on tablet, 4 cols on desktop
- Each card: Large number display (text-2xl, bold), label (text-sm, muted), copy button (top-right corner)
- Hover effect: subtle elevation increase
- Formula tooltips with ? icon next to labels

**Formula Display**:
- Small, muted text below keypad
- Monospace font for mathematical clarity

### Pro-Rata Tab Design
**Form Layout**:
- Two-column grid on desktop (gap-6)
- Single column on mobile
- Date pickers with calendar icon
- Number inputs with JD currency symbol
- Toggle switch for 15-day cycle (large, accessible)

**Progress Visualization**:
- Horizontal progress bar (h-4, rounded-full)
- Animated fill (Framer Motion)
- Percentage label overlay

**Results Panel**:
- Large percentage display (text-5xl, accent color)
- Detailed breakdown in card format
- Explanation text block: Receipt-style, bordered container, RTL-aware
- Action buttons row: Copy Text, Text-to-Speech (speaker icon), Reset

### Chatbot Interface
**Floating Button**: 
- Fixed bottom-right position (bottom-6, right-6)
- Large circular button with chat icon
- Pulsing badge for new messages
- z-index above all content

**Chat Panel**:
- Slide-in animation from right (Framer Motion)
- Width: 400px on desktop, full-screen on mobile
- Message bubbles: User (accent color, right-aligned), Assistant (neutral, left-aligned)
- Input bar: Fixed bottom with send button
- Quick-reply chips above input (scrollable horizontal)

**Message Styling**:
- Rounded corners (rounded-2xl for bubbles)
- Timestamp (text-xs, muted)
- Typing indicator with animated dots

## Interactions & Animations

**Micro-interactions** (Framer Motion):
- Tab switch: Fade in/out with slight y-axis slide
- Card hover: Scale 1.02, shadow increase
- Button press: Scale 0.98
- Copy confirmation: Toast notification (slide from top-right)
- Number input: Pulse on value change

**Toast System**: 
- shadcn/ui toast component
- Position: top-right
- Auto-dismiss: 3s
- Success/error variants with icons

## Accessibility Features

- **Keyboard Navigation**: Visible focus rings (ring-2, ring-offset-2, accent color)
- **ARIA Labels**: All interactive elements, form inputs, and icon buttons
- **Contrast**: WCAG AA minimum on all text/background combinations
- **Screen Reader**: Descriptive labels for calculations and results
- **RTL Support**: Mirrored spacing, reversed grids, flipped icons where needed

## Internationalization

**Arabic (RTL)**:
- Right-to-left text direction
- Mirrored layout components (e.g., sticky panel on left)
- Arabic numerals in displays
- Right-aligned text inputs

**English (LTR)**:
- Standard left-to-right
- Western numerals
- Left-aligned inputs

**Shared**:
- Language switcher with smooth transition
- Persistent preference in localStorage
- Currency formatting per locale

## Images
**No hero images required** - This is a utility application focused on tools and functionality. Visual hierarchy comes from typography, spacing, and card-based layouts rather than imagery.