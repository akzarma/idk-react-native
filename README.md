# Edge AI Playground - React Native

A modern React Native mobile application showcasing on-device AI capabilities with practical use cases including conversational AI, email analysis, and spending analytics.

## 🌟 Features

### 1. **Edge Chat**
- Chat with an on-device AI model (Llama 3.2 1B)
- Completely private - all processing happens locally
- No internet connection required for inference
- Lightweight and fast responses

### 2. **Email Analyzer**
- Automatically extracts purchase amounts from emails using on-device AI
- Batch processes multiple emails
- Displays extracted purchase information with email details
- Real-time progress tracking during analysis

### 3. **Analytics Dashboard**
- Beautiful spending analytics with interactive charts
- Multiple time filters: Today, Week, Month, Year
- Visualizations include:
  - Pie charts for category distribution
  - Line charts for spending trends
  - Bar charts for top categories
  - Detailed transaction list with category breakdown
- Mock data for demonstration purposes

## 🎨 Design

- **Modern Light Mode UI**: Clean, professional design with a light color scheme
- **Consistent Blue Accents**: Using #3B82F6 for interactive elements
- **Card-Based Layout**: Subtle shadows and borders for depth
- **Smooth Animations**: Polished user experience throughout

## 🛠️ Tech Stack

- **Framework**: React Native (0.81.4) with Expo (~54.0.13)
- **Language**: TypeScript (5.9.2)
- **AI/ML**: react-native-executorch (0.5.12) for on-device inference
- **Charts**: react-native-chart-kit (6.12.0) + react-native-svg
- **UI**: React Native Safe Area Context for proper layout handling

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and SDK

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd idk-react-native
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## 📱 Running the App

### Development Mode (Expo Go - Limited AI functionality)
```bash
npm start
```
Then scan the QR code with Expo Go app.

**Note**: AI features require a development build due to native modules.

### Development Build (Recommended for AI features)

**Android**:
```bash
npm run android
```

**iOS**:
```bash
npm run ios
```

These commands will:
1. Build the native project
2. Install the app on your device/emulator
3. Start the Metro bundler

## 🧠 On-Device AI Model

The app uses **Llama 3.2 1B** model via react-native-executorch:
- Model is downloaded automatically on first use
- Cached locally for subsequent uses
- Approximately ~1GB download size
- Runs inference entirely on-device

## 📂 Project Structure

```
idk-react-native/
├── App.tsx                          # Main app component with navigation
├── src/
│   ├── components/
│   │   └── AnalyticsScreen.tsx     # Analytics dashboard component
│   ├── data/
│   │   └── mockSpendData.ts        # Mock spending data generator
│   └── prompts/
│       └── emailPurchasePrompt.ts  # AI prompt for email analysis
├── mock_emails.json                 # Sample emails for testing
├── assets/                          # App icons and images
└── android/                         # Android native code
```

## 🎯 Key Components

### HomeScreen
Entry point with three feature cards:
- Edge Chat
- Email Analyzer  
- Analytics

### ChatScreen
Conversational interface with on-device AI:
- Real-time message streaming
- Message history management
- Model status indicators

### EmailAnalyzerScreen
Email processing interface:
- Batch email analysis
- Progress tracking
- Results display with extraction details
- Modal views for detailed information

### AnalyticsScreen
Spending analytics dashboard:
- Time period filters
- Multiple chart types
- Category breakdowns
- Transaction history

## 🔧 Configuration

### Model Configuration
The app uses LLAMA3_2_1B model by default. To change the model, modify the `useEdgeModel` hook in `App.tsx`.

### Mock Data
- Email samples: `mock_emails.json`
- Spending data: `src/data/mockSpendData.ts`

## 📊 Analytics Features

The analytics screen includes:
- **Total Spend Card**: Shows total spending with transaction count and average
- **Spending Trend**: Line chart for historical spending patterns
- **Category Distribution**: Pie chart showing spending by category
- **Top Categories**: Bar chart of highest spending categories
- **Transaction List**: Detailed recent transactions

## 🎨 Customization

### Colors
Main theme colors are defined in StyleSheet:
- Primary: `#3B82F6` (Blue)
- Background: `#F8FAFC` (Light gray)
- Text: `#0F172A` (Dark slate)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)

### Fonts
Default system fonts are used with weights:
- Regular: 400
- Medium: 500
- SemiBold: 600
- Bold: 700

## 🐛 Troubleshooting

### Model Download Issues
- Ensure stable internet connection for first-time download
- Check available storage (requires ~1GB)
- Clear app cache and restart if download fails

### Build Issues
```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Rebuild
npm run android
```

### Missing Dependencies
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## 📝 Development Notes

- **New Architecture Enabled**: Using React Native's new architecture
- **Edge to Edge**: Android app uses edge-to-edge display
- **TypeScript**: Fully typed for better development experience
- **Safe Area**: Proper handling of notches and safe areas

## 🔒 Privacy

- All AI inference happens on-device
- No data is sent to external servers
- Email analysis is performed locally
- Analytics data is mock data for demonstration

## 🚧 Future Enhancements

Potential features to add:
- Real email integration (Gmail, Outlook APIs)
- Export analytics as CSV/PDF
- Additional chart types
- Dark mode support
- Custom spending categories
- Budget tracking and alerts

## 📄 License

Private project - All rights reserved

## 👨‍💻 Author

Built with ❤️ using React Native and On-Device AI

---

**Note**: This is a demonstration app showcasing on-device AI capabilities. The email analyzer and analytics features use mock data for testing purposes.

