# Ayurvedic Herbs Supply Chain Management System

A comprehensive full-stack web application for managing the supply chain of Ayurvedic herbs with complete traceability from farm to consumer.

## Features

- **Role-Based Authentication**: Secure login with PIN validation for Processing Units, Lab Units, and Manufacturing Units
- **Complete Traceability**: Track herbs through their entire journey from farmer to consumer
- **QR Code Generation**: Generate unique QR codes for consumer verification
- **Public Verification**: Consumers can scan QR codes to view complete herb history
- **Lab Testing Management**: Comprehensive testing workflow with certificate uploads
- **Manufacturing Control**: Batch management and final product preparation

## Technology Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- CORS enabled

### Frontend
- React 18
- React Router for navigation
- Axios for API calls
- CSS3 with responsive design

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create a `.env` file with the following variables:
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/ayurvedic-herbs
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
\`\`\`

4. Start the server:
\`\`\`bash
npm run dev
\`\`\`

5. Create default users (optional):
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/create-users
\`\`\`

### Frontend Setup

1. Navigate to the frontend directory:
\`\`\`bash
cd frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create a `.env` file (optional):
\`\`\`env
REACT_APP_API_URL=http://localhost:5000/api
\`\`\`

4. Start the development server:
\`\`\`bash
npm start
\`\`\`

## User Roles & PINs

### Processing Unit
- **Username**: processor1
- **Password**: password123
- **PIN**: 121412

### Lab Unit
- **Username**: lab1
- **Password**: password123
- **PIN**: 141212

### Manufacturing Unit
- **Username**: manufacturer1
- **Password**: password123
- **PIN**: 141412

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login with PIN validation
- `POST /api/auth/create-users` - Create default users

### Herbs Management
- `POST /api/herbs/sync` - Sync herb data from farmer's DApp
- `GET /api/herbs` - Get herbs filtered by user role
- `GET /api/herbs/:id` - Get single herb details
- `PUT /api/herbs/processing/:id` - Update processing data
- `PUT /api/herbs/lab/:id` - Update lab testing data
- `POST /api/herbs/manufacture/:id` - Complete manufacturing and generate QR

### Public Access
- `GET /api/public/herb/:qrCodeId` - Get herb data for public verification

### AI Placeholder
- `GET /api/ai/predict-harvest` - Placeholder for future AI predictions

## Database Schema

The system uses a single comprehensive MongoDB document for each herb, storing:

- **Initial Data**: Farmer details, collection point, photos, initial weight
- **Processing Data**: Drying methods, cleaning steps, final weight
- **Lab Testing**: Test parameters, certificates, overall results
- **Manufacturing**: Batch numbers, QR codes, packaging details

## Workflow

1. **Data Sync**: Herb data is synced from farmer's offline DApp
2. **Processing**: Processing units add drying and cleaning details
3. **Lab Testing**: Lab units conduct quality tests and upload certificates
4. **Manufacturing**: Manufacturing units create final products and generate QR codes
5. **Consumer Verification**: Consumers scan QR codes to view complete herb journey

## QR Code Verification

Each completed product gets a unique QR code that links to:
`/verify?id={qrCodeId}`

This public page displays the complete herb journey including:
- Farmer and collection details
- Processing information
- Lab test results and certificates
- Manufacturing and packaging details

## Security Features

- JWT-based authentication
- Role-based access control
- PIN validation for additional security
- File upload validation
- CORS protection

## Future Enhancements

- AI-powered harvest prediction
- Blockchain integration for immutable records
- Mobile app for farmers
- Advanced analytics dashboard
- Multi-language support

## Support

For technical support or questions, please contact the development team.
