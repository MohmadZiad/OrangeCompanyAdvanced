# Orange Tools

A modern, single-page web application featuring professional Orange pricing calculator, Pro-Rata billing calculator, and an AI-powered assistant.

## Features

### 🧮 Orange Price Calculator
- Custom numeric keypad UI for easy input
- Real-time calculations for four pricing variants:
  - Base price
  - Nos_b_Nos: `A + (A/2 × 0.4616) + (A/2 × 0.16)`
  - Voice Calls Only: `A × 1.4616`
  - Data Only: `A × 1.16`
- Formula tooltips and copy-to-clipboard functionality
- Example data button for quick testing

### 📊 Pro-Rata Calculator
- 15-day billing cycle calculations
- Date pickers for activation, invoice, and custom end dates
- Visual progress bar showing percentage used
- Detailed receipt-style explanation in current language
- Text-to-speech functionality (Web Speech API)
- Copy and reset capabilities

### 🤖 AI Assistant Chatbot
- OpenAI-powered (GPT-5) conversational AI
- Explains calculator formulas and usage
- Supports both English and Arabic
- Floating button with slide-in panel
- Quick-reply suggestions
- Message history persisted in localStorage

### 🎨 Multi-Theme Support
Four beautiful themes with localStorage persistence:
- **Orange** (Default) - Warm, energetic orange accent
- **Dark** - High-contrast dark mode
- **Blossom** - Soft pink/purple palette
- **Mint** - Cool green/teal theme

### 🌍 Full Internationalization
- English (LTR) and Arabic (RTL) support
- Auto-detection of browser language
- Localized number formatting
- Currency display in JD (Jordanian Dinar)
- Arabic numerals in AR locale

### ♿ Accessibility
- Keyboard navigation throughout
- ARIA labels and roles
- WCAG AA contrast ratios
- Screen reader friendly
- Focus indicators on all interactive elements

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Zustand** for state management
- **React Hook Form** + Zod for form validation
- **Framer Motion** for animations
- **Lucide React** for icons
- **date-fns** for date manipulation
- **Wouter** for routing

### Backend
- **Express** server
- **OpenAI SDK** (GPT-5)
- Basic rate limiting (10 requests/minute)
- Environment-based API key management

## Getting Started

### Prerequisites
- Node.js 18+ 
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Chatbot.tsx          # AI assistant
│   │   │   ├── OrangeCalculator.tsx # Price calculator
│   │   │   ├── ProRataCalculator.tsx # Billing calculator
│   │   │   ├── NumericKeypad.tsx     # Custom keypad
│   │   │   ├── ResultCard.tsx        # Result display
│   │   │   ├── ThemeToggle.tsx       # Theme switcher
│   │   │   ├── LanguageToggle.tsx    # Language switcher
│   │   │   ├── CopyButton.tsx        # Copy utility
│   │   │   └── SummaryPanel.tsx      # Results summary
│   │   ├── lib/             # Utility libraries
│   │   │   ├── calc.ts      # Calculator formulas
│   │   │   ├── proRata.ts   # Pro-rata logic
│   │   │   ├── format.ts    # Number/currency/date formatting
│   │   │   ├── i18n.ts      # Translations
│   │   │   └── store.ts     # Zustand store
│   │   ├── pages/           # Page components
│   │   │   └── Home.tsx     # Main app page
│   │   └── index.css        # Global styles + themes
│   └── index.html
├── server/
│   ├── routes.ts            # API routes
│   ├── openai.ts            # OpenAI client + system prompt
│   └── index.ts             # Express server
├── shared/
│   └── schema.ts            # Shared TypeScript types + Zod schemas
└── README.md
```

## Usage

### Calculator Tab
1. Enter a base price using the numeric keypad or input field
2. Results update in real-time
3. Click the copy button on any result card to copy the value
4. Hover over the `?` icon to see the formula
5. Use "Fill Example" to populate with sample data

### Pro-Rata Tab
1. Select the activation date
2. Select the invoice issue date
3. Enter monthly subscription value
4. Optionally add full invoice amount and custom end date
5. Toggle the 15-day cycle switch if needed
6. Click "Calculate" to see results
7. Use "Copy Text" to copy the explanation
8. Use "Read Aloud" for text-to-speech

### Assistant Tab
1. Click the "Help" button in the header or floating button
2. Type your question or click a quick reply
3. Chat with the AI about calculator formulas and usage
4. Messages persist in localStorage

### Hash-Based Deep Linking
Navigate directly to tabs using URL hashes:
- `#calculator` - Orange Price Calculator
- `#pro-rata` - Pro-Rata Calculator
- `#assistant` - AI Assistant

### Theme Switching
Click the palette icon in the header to switch between Orange, Dark, Blossom, and Mint themes. Your choice is saved in localStorage.

### Language Switching
Click the languages icon in the header to toggle between English and Arabic. The interface updates immediately with full RTL support for Arabic.

## API Endpoints

### POST /api/chat
Chat with the OpenAI assistant.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "How do I calculate Nos_b_Nos?",
      "timestamp": 1234567890
    }
  ]
}
```

**Response:**
```json
{
  "message": "The Nos_b_Nos formula is..."
}
```

**Rate Limiting:** 10 requests per minute per IP

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `NODE_ENV` - Environment mode (development/production)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

This project is for demonstration purposes.

## Credits

Built with modern web technologies and best practices for accessibility, internationalization, and user experience.
