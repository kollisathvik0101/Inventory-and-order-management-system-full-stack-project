# Inventory & Order Management System

A full-stack inventory and order management system built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript.

## Features

- **Inventory Management**
  - Add, edit, and delete products
  - Track stock quantities and minimum stock levels
  - Low stock alerts
  - Product categorization
  - Search functionality

- **Order Management**
  - Create and manage orders
  - Automatic stock deduction
  - Order status tracking (pending, processing, shipped, delivered, cancelled)
  - Order details view
  - Stock restoration on order deletion

- **Dashboard**
  - Real-time statistics
  - Total products count
  - Low stock alerts
  - Order statistics
  - Total inventory value

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Connection**: Mongoose ODM

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB instance)

## Installation

1. Clone or download the project

2. Install dependencies:
```bash
npm install
```

3. The MongoDB connection string is already configured in `server.js`. Make sure you have access to the MongoDB cluster:
   - Connection String: `mongodb+srv://user:CTPGenL6y0LGXFoK@cluster0.zdufhbt.mongodb.net/inventory`

4. Start the server:
```bash
npm start
```

   Or for development with auto-reload:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
ProjectX/
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       └── app.js        # Frontend JavaScript
└── README.md             # This file
```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order (restores stock)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

### Product
- `name` (String, required)
- `description` (String)
- `sku` (String, required, unique)
- `price` (Number, required)
- `stock_quantity` (Number, default: 0)
- `min_stock_level` (Number, default: 0)
- `category` (String)
- `createdAt`, `updatedAt` (Auto-generated timestamps)

### Order
- `order_number` (String, required, unique)
- `customer_name` (String, required)
- `customer_email` (String)
- `customer_phone` (String)
- `status` (String, default: 'pending')
- `total_amount` (Number, default: 0)
- `notes` (String)
- `items` (Array of OrderItem)
- `createdAt`, `updatedAt` (Auto-generated timestamps)

### OrderItem
- `product_id` (ObjectId, reference to Product)
- `quantity` (Number, required)
- `unit_price` (Number, required)
- `subtotal` (Number, required)

## Usage

1. **Add Products**: Navigate to the Inventory tab and click "Add Product"
2. **Create Orders**: Navigate to the Orders tab and click "Create Order"
3. **Monitor Dashboard**: View real-time statistics on the Dashboard tab
4. **Track Orders**: View order details and update status as orders progress
5. **Manage Stock**: Products automatically update stock when orders are created or deleted

## Security Note

⚠️ **Important**: The MongoDB connection string with credentials is hardcoded in `server.js`. For production use, please:
- Use environment variables
- Store credentials securely
- Implement authentication/authorization
- Add input validation and sanitization
- Use HTTPS

## License

ISC

