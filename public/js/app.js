// API Base URL
const API_BASE = '/api';

// Auth helpers
function getToken() {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
}
function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// State
let currentOrderId = null;
let products = [];
let orders = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModals();
    setupForms();
    loadDashboard();
    loadProducts();
    loadOrders();
});

// Tab Navigation
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            if (targetTab === 'dashboard') {
                loadDashboard();
            } else if (targetTab === 'inventory') {
                loadProducts();
            } else if (targetTab === 'orders') {
                loadOrders();
            }
        });
    });
}

// Modal Setup
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closes = document.querySelectorAll('.close');
    
    closes.forEach(close => {
        close.addEventListener('click', () => {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });
    
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Forms Setup
function setupForms() {
    // Product Form
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });
    
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('cancel-product-btn').addEventListener('click', () => {
        document.getElementById('product-modal').style.display = 'none';
    });
    
    // Order Form
    document.getElementById('add-order-btn').addEventListener('click', () => {
        openOrderModal();
    });
    
    document.getElementById('order-form').addEventListener('submit', handleOrderSubmit);
    document.getElementById('cancel-order-btn').addEventListener('click', () => {
        document.getElementById('order-modal').style.display = 'none';
    });
    
    document.getElementById('add-item-btn').addEventListener('click', addOrderItem);
    
    // Order Details
    document.getElementById('update-status-btn').addEventListener('click', updateOrderStatus);
    document.getElementById('close-order-details-btn').addEventListener('click', () => {
        document.getElementById('order-details-modal').style.display = 'none';
    });
    
    // Product Search
    document.getElementById('product-search').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();
        
        document.getElementById('stat-total-products').textContent = stats.total_products || 0;
        document.getElementById('stat-low-stock').textContent = stats.low_stock_products || 0;
        document.getElementById('stat-total-orders').textContent = stats.total_orders || 0;
        document.getElementById('stat-pending-orders').textContent = stats.pending_orders || 0;
        document.getElementById('stat-inventory-value').textContent = `$${(stats.total_inventory_value || 0).toFixed(2)}`;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('stat-total-products').textContent = '0';
        document.getElementById('stat-low-stock').textContent = '0';
        document.getElementById('stat-total-orders').textContent = '0';
        document.getElementById('stat-pending-orders').textContent = '0';
        document.getElementById('stat-inventory-value').textContent = '$0.00';
    }
}

// Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        products = Array.isArray(data) ? data : [];
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        products = [];
        renderProducts([]);
    }
}

function renderProducts(productsToRender) {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';
    
    if (!Array.isArray(productsToRender)) {
        productsToRender = [];
    }
    
    productsToRender.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.sku}</td>
            <td>${product.name}</td>
            <td>${product.category || '-'}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.stock_quantity}</td>
            <td>${product.min_stock_level}</td>
            <td>
                <span class="status-badge ${product.low_stock ? 'low-stock' : 'in-stock'}">
                    ${product.low_stock ? 'Low Stock' : 'In Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editProduct('${product._id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterProducts(searchTerm) {
    if (!Array.isArray(products)) {
        products = [];
    }
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    renderProducts(filtered);
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');
    
    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('product-id').value = product._id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-stock').value = product.stock_quantity;
        document.getElementById('product-min-stock').value = product.min_stock_level;
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('product-id').value = '';
    }
    
    modal.style.display = 'block';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        stock_quantity: parseInt(document.getElementById('product-stock').value) || 0,
        min_stock_level: parseInt(document.getElementById('product-min-stock').value) || 0
    };
    
    const productId = document.getElementById('product-id').value;
    const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;
    const method = productId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            document.getElementById('product-modal').style.display = 'none';
            loadProducts();
            loadDashboard();
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.error || 'Error saving product';
            console.error('Product save error:', errorMessage);
            alert(`Error: ${errorMessage}\n\nIf this is a database connection issue, please check:\n1. MongoDB connection string\n2. Network access in MongoDB Atlas\n3. Server console for connection status`);
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product');
    }
}

async function editProduct(id) {
    if (!Array.isArray(products)) {
        products = [];
    }
    const product = products.find(p => p._id === id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: { ...authHeaders() }
        });
        
        if (response.ok) {
            loadProducts();
            loadDashboard();
        } else {
            alert('Error deleting product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
    }
}

// Orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        orders = Array.isArray(data) ? data : [];
        renderOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        orders = [];
        renderOrders([]);
    }
}

function renderOrders(ordersToRender) {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';
    
    if (!Array.isArray(ordersToRender)) {
        ordersToRender = [];
    }
    
    ordersToRender.forEach(order => {
        const date = new Date(order.createdAt).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.order_number}</td>
            <td>${order.customer_name}</td>
            <td>${order.items.length} item(s)</td>
            <td>$${order.total_amount.toFixed(2)}</td>
            <td><span class="status-badge ${order.status}">${order.status}</span></td>
            <td>${date}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewOrderDetails('${order._id}')">View</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order._id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openOrderModal() {
    const modal = document.getElementById('order-modal');
    document.getElementById('order-form').reset();
    document.getElementById('order-items-container').innerHTML = '';
    addOrderItem();
    currentOrderId = null;
    updateOrderTotal();
    modal.style.display = 'block';
}

function addOrderItem() {
    const container = document.getElementById('order-items-container');
    const itemRow = document.createElement('div');
    itemRow.className = 'order-item-row';
    
    const productsList = Array.isArray(products) ? products : [];
    itemRow.innerHTML = `
        <select class="order-product-select" onchange="updateOrderItemPrice(this)">
            <option value="">Select Product</option>
            ${productsList.map(p => `<option value="${p._id}" data-price="${p.price}">${p.name} (Stock: ${p.stock_quantity})</option>`).join('')}
        </select>
        <input type="number" class="order-quantity" placeholder="Qty" min="1" value="1" onchange="updateOrderItemSubtotal(this)" oninput="updateOrderItemSubtotal(this)">
        <span class="order-item-price">$0.00</span>
        <span class="order-item-subtotal">$0.00</span>
        <button type="button" class="btn btn-danger btn-sm remove-item-btn" onclick="removeOrderItem(this)">Remove</button>
    `;
    container.appendChild(itemRow);
}

function removeOrderItem(btn) {
    btn.closest('.order-item-row').remove();
    updateOrderTotal();
}

function updateOrderItemPrice(select) {
    const row = select.closest('.order-item-row');
    const price = parseFloat(select.selectedOptions[0]?.dataset.price || 0);
    row.querySelector('.order-item-price').textContent = `$${price.toFixed(2)}`;
    updateOrderItemSubtotal(row.querySelector('.order-quantity'));
}

function updateOrderItemSubtotal(input) {
    const row = input.closest('.order-item-row');
    const price = parseFloat(row.querySelector('.order-item-price').textContent.replace('$', '') || 0);
    const quantity = parseInt(input.value || 0);
    const subtotal = price * quantity;
    row.querySelector('.order-item-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    updateOrderTotal();
}

function updateOrderTotal() {
    const subtotals = Array.from(document.querySelectorAll('.order-item-subtotal'))
        .map(el => parseFloat(el.textContent.replace('$', '') || 0));
    const total = subtotals.reduce((sum, val) => sum + val, 0);
    document.getElementById('order-total').textContent = `$${total.toFixed(2)}`;
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const items = Array.from(document.querySelectorAll('.order-item-row'))
        .map(row => {
            const select = row.querySelector('.order-product-select');
            const quantity = parseInt(row.querySelector('.order-quantity').value);
            if (!select.value || !quantity) return null;
            return {
                product_id: select.value,
                quantity: quantity
            };
        })
        .filter(item => item !== null);
    
    if (items.length === 0) {
        alert('Please add at least one item to the order');
        return;
    }
    
    const orderData = {
        customer_name: document.getElementById('order-customer-name').value,
        customer_email: document.getElementById('order-customer-email').value,
        customer_phone: document.getElementById('order-customer-phone').value,
        notes: document.getElementById('order-notes').value,
        items: items
    };
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            document.getElementById('order-modal').style.display = 'none';
            loadOrders();
            loadProducts(); // Refresh to show updated stock
            loadDashboard();
        } else {
            const error = await response.json();
            alert(error.error || 'Error creating order');
        }
    } catch (error) {
        console.error('Error creating order:', error);
        alert('Error creating order');
    }
}

async function viewOrderDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/orders/${id}`);
        const order = await response.json();
        currentOrderId = order._id;
        
        const content = document.getElementById('order-details-content');
        content.innerHTML = `
            <div class="order-details">
                <div class="order-details-item">
                    <strong>Order Number:</strong> ${order.order_number}
                </div>
                <div class="order-details-item">
                    <strong>Customer:</strong> ${order.customer_name}
                </div>
                <div class="order-details-item">
                    <strong>Email:</strong> ${order.customer_email || '-'}
                </div>
                <div class="order-details-item">
                    <strong>Phone:</strong> ${order.customer_phone || '-'}
                </div>
                <div class="order-details-item">
                    <strong>Status:</strong> <span class="status-badge ${order.status}">${order.status}</span>
                </div>
                <div class="order-details-item">
                    <strong>Total:</strong> $${order.total_amount.toFixed(2)}
                </div>
                <div class="order-details-item">
                    <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}
                </div>
                ${order.notes ? `<div class="order-details-item"><strong>Notes:</strong> ${order.notes}</div>` : ''}
                <h3 style="margin-top: 20px;">Items:</h3>
                <table style="width: 100%; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.product_id?.name || 'N/A'}</td>
                                <td>${item.quantity}</td>
                                <td>$${item.unit_price.toFixed(2)}</td>
                                <td>$${item.subtotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('order-status-select').value = order.status;
        document.getElementById('order-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('Error loading order details');
    }
}

async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    const status = document.getElementById('order-status-select').value;
    
    try {
        const response = await fetch(`${API_BASE}/orders/${currentOrderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            document.getElementById('order-details-modal').style.display = 'none';
            loadOrders();
            loadDashboard();
        } else {
            alert('Error updating order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    }
}

async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this order? Stock will be restored.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/orders/${id}`, {
            method: 'DELETE',
            headers: { ...authHeaders() }
        });
        
        if (response.ok) {
            loadOrders();
            loadProducts();
            loadDashboard();
        } else {
            alert('Error deleting order');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order');
    }
}

