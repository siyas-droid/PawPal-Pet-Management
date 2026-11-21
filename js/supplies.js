
// =====================================
// PAWPAL - PET SUPPLIES
// =====================================

// Product catalogue
const products = [
    { id: 1, name: "Premium Dog Food", category: "food", price: 899, emoji: "🥣", description: "Nutritious food for healthy and happy dogs." },
    { id: 2, name: "Cat Food", category: "food", price: 599, emoji: "🐱", description: "Tasty and nutritious food for cats." },
    { id: 3, name: "Dog Chew Toy", category: "toys", price: 249, emoji: "🦴", description: "A fun and durable chew toy." },
    { id: 4, name: "Plush Teddy Toy", category: "toys", price: 349, emoji: "🧸", description: "A soft and cuddly toy for your pet." },
    { id: 5, name: "Pet Collar", category: "accessories", price: 199, emoji: "🐕", description: "A stylish and comfortable pet collar." },
    { id: 6, name: "Pet Feeding Bowl", category: "accessories", price: 299, emoji: "🥣", description: "A convenient bowl for daily feeding." },
    { id: 7, name: "Pet Shampoo", category: "care", price: 399, emoji: "🧴", description: "Gentle shampoo for your pet's coat." },
    { id: 8, name: "Pet Grooming Brush", category: "care", price: 249, emoji: "🪮", description: "Keep your pet's coat clean and smooth." }
];

// HTML elements
const productContainer = document.getElementById("productContainer");
const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("categoryFilter");

// =====================================
// TOAST MESSAGE
// =====================================

function showToast(message) {
    let toast = document.getElementById("pawpalToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "pawpalToast";
        toast.className = "pawpal-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.pawpalToastTimer);

    window.pawpalToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}

// =====================================
// DISPLAY PRODUCTS
// =====================================

function displayProducts(productList) {
    productContainer.innerHTML = "";

    if (productList.length === 0) {
        productContainer.innerHTML = `
            <p class="no-products">
                No products found. Try another search!
            </p>
        `;
        return;
    }

    productList.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <div class="product-image">${product.emoji}</div>

            <div class="product-details">
                <span class="product-category">${product.category}</span>
                <h3>${product.name}</h3>
                <p>${product.description}</p>

                <div class="product-bottom">
                    <strong>₹${product.price}</strong>

                    <button class="add-cart-btn"
                        onclick="addToCart(${product.id})">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        productContainer.appendChild(card);
    });
}

// =====================================
// SEARCH AND FILTER
// =====================================

function filterProducts() {
    const searchValue = productSearch.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchValue) ||
            product.description.toLowerCase().includes(searchValue);

        const matchesCategory =
            selectedCategory === "all" ||
            product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filteredProducts);
}

productSearch.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

// =====================================
// SHOPPING CART
// =====================================

let cart = JSON.parse(localStorage.getItem("pawpalCart")) || [];

function saveCart() {
    localStorage.setItem("pawpalCart", JSON.stringify(cart));
}

function updateCartCount() {
    const cartCount = document.getElementById("cartCount");

    if (!cartCount) return;

    const count = cart.reduce(
        (total, item) => total + Number(item.quantity),
        0
    );

    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? "flex" : "none";
}

function addToCart(productId) {
    const product = products.find(item => item.id === productId);

    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            emoji: product.emoji,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();
    displayCart();
    showToast("✓ Added to cart successfully");
}

// =====================================
// OPEN AND CLOSE CART PANEL
// =====================================

function openCart() {
    if (document.getElementById("cartOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "cartOverlay";
    overlay.className = "cart-overlay";

    overlay.innerHTML = `
        <div class="cart-panel">

            <div class="cart-panel-header">

                <div>
                    <h2>🛒 My Shopping Cart</h2>
                    <p>Your pet's goodies are waiting!</p>
                </div>

                <button class="cart-close-btn"
                    onclick="closeCart()">×</button>

            </div>

            <div id="cartContainer" class="cart-panel-content"></div>

            <div class="cart-panel-footer" id="cartSummary"
                style="display:none;">

                <div class="cart-total-row">
                    <span>Cart Total</span>
                    <strong id="cartTotal">₹0</strong>
                </div>

                <button class="checkout-btn"
                    onclick="checkout()">
                    Proceed to Checkout →
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    displayCart();

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeCart();
        }
    });
}

function closeCart() {
    const overlay = document.getElementById("cartOverlay");

    if (overlay) {
        overlay.remove();
    }
}

// =====================================
// DISPLAY CART ITEMS
// =====================================

function displayCart() {
    const cartContainer = document.getElementById("cartContainer");
    const cartSummary = document.getElementById("cartSummary");
    const cartTotal = document.getElementById("cartTotal");

    updateCartCount();

    if (!cartContainer || !cartSummary || !cartTotal) return;

    cartContainer.innerHTML = "";

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <div style="font-size:55px;">🛒</div>
                <h3>Your cart is empty!</h3>
                <p>Add some goodies for your furry friend.</p>
                <button class="add-cart-btn"
                    onclick="closeCart()">
                    Continue Shopping
                </button>
            </div>
        `;

        cartSummary.style.display = "none";
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div class="cart-product-info">
                <span class="cart-product-emoji">${item.emoji}</span>

                <div>
                    <h3>${item.name}</h3>
                    <p>₹${item.price} each</p>
                </div>
            </div>

            <div class="cart-controls">

                <button onclick="changeQuantity(${item.id}, -1)">−</button>

                <span>${item.quantity}</span>

                <button onclick="changeQuantity(${item.id}, 1)">+</button>

                <button class="remove-cart-btn"
                    onclick="removeFromCart(${item.id})">
                    Remove
                </button>

            </div>

            <strong>₹${item.price * item.quantity}</strong>
        `;

        cartContainer.appendChild(cartItem);
    });

    cartTotal.textContent = "₹" + total;
    cartSummary.style.display = "block";
}

function changeQuantity(productId, change) {
    const item = cart.find(product => product.id === productId);

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(product => product.id !== productId);
    }

    saveCart();
    displayCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);

    saveCart();
    displayCart();

    showToast("Product removed from cart");
}

// =====================================
// CHECKOUT OVERLAY
// =====================================

function checkout() {
    if (cart.length === 0) {
        showToast("Your cart is empty!");
        return;
    }

    const user = JSON.parse(
        sessionStorage.getItem("pawpalUser") || "null"
    );

    if (!user || !user.user_id) {
        showToast("Please login before checkout");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

        return;
    }

    if (document.getElementById("checkoutOverlay")) return;

    closeCart();

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const overlay = document.createElement("div");
    overlay.id = "checkoutOverlay";
    overlay.className = "checkout-overlay";
    overlay.style.cssText = `
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    z-index: 999999 !important;
    background: rgba(0, 0, 0, 0.65);
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 15px;
    box-sizing: border-box;
    overflow-y: auto;
`;

    overlay.innerHTML = `
        <div class="checkout-modal">

            <button class="checkout-close"
                onclick="closeCheckout()">×</button>

            <div class="checkout-heading">
                <span>🐾</span>
                <h2>Complete Your Order</h2>
                <p>Just a few more details before your pet's goodies arrive!</p>
            </div>

            <form id="checkoutForm">

                <h3>Delivery Details</h3>

                <label>Full Name</label>
                <input type="text" id="checkoutName"
                    value="${escapeHTML(user.full_name || "")}"
                    required>

                <label>Email Address</label>
                <input type="email" id="checkoutEmail"
                    value="${escapeHTML(user.email || "")}"
                    readonly>

                <label>Phone Number</label>
                <input type="tel" id="checkoutPhone"
                    value="${escapeHTML(user.phone || "")}"
                    required>

                <label>Delivery Address</label>
                <textarea id="checkoutAddress"
                    rows="3" required>${escapeHTML(user.address || "")}</textarea>

                <h3 class="payment-heading">Payment Method</h3>

                <label class="payment-option">
                    <input type="radio" name="paymentMethod"
                        value="UPI" required>
                    <span>📱 UPI</span>
                </label>

                <label class="payment-option">
                    <input type="radio" name="paymentMethod"
                        value="Cash on Delivery">
                    <span>💵 Cash on Delivery</span>
                </label>

                <label class="payment-option">
                    <input type="radio" name="paymentMethod"
                        value="Net Banking">
                    <span>🏦 Net Banking</span>
                </label>

                <div class="checkout-total">
                    <span>Order Total</span>
                    <strong>₹${total}</strong>
                </div>

                <button type="submit" class="place-order-btn"
                    id="placeOrderButton">
                    Place Order →
                </button>

            </form>
        </div>
    `;
    const modal = overlay.querySelector(".checkout-modal");

modal.style.cssText = `
    background: white;
    color: #333;
    width: 100%;
    max-width: 550px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 30px;
    border-radius: 15px;
    position: relative;
    margin: auto;
    box-sizing: border-box;
    flex-shrink: 0;
`;

    document.documentElement.appendChild(overlay);

    document.getElementById("checkoutForm")
        .addEventListener("submit", placeOrder);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeCheckout();
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function closeCheckout() {
    const overlay = document.getElementById("checkoutOverlay");

    if (overlay) overlay.remove();
}

// =====================================
// PLACE ORDER
// =====================================

async function placeOrder(event) {
    event.preventDefault();

    const user = JSON.parse(
        sessionStorage.getItem("pawpalUser") || "null"
    );

    if (!user || !user.user_id) {
        showToast("Please login again");
        return;
    }

    const customerName = document.getElementById("checkoutName").value.trim();
    const phone = document.getElementById("checkoutPhone").value.trim();
    const address = document.getElementById("checkoutAddress").value.trim();

    const selectedPayment = document.querySelector(
        'input[name="paymentMethod"]:checked'
    );

    if (!customerName || !phone || !address || !selectedPayment) {
        showToast("Please complete all checkout details");
        return;
    }

    const button = document.getElementById("placeOrderButton");
    button.disabled = true;
    button.textContent = "Placing Order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.user_id,
                customer_name: customerName,
                phone: phone,
                delivery_address: address,
                payment_method: selectedPayment.value,
                items: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to place order.");
        }

        cart = [];
        saveCart();
        updateCartCount();
        closeCheckout();

        showToast("🎉 Order placed successfully! Order #" + data.order_id);

    } catch (error) {
        console.error(error);
        showToast(error.message || "Unable to place order");

        button.disabled = false;
        button.textContent = "Place Order →";
    }
}

// =====================================
// INITIAL PAGE DISPLAY
// =====================================

displayProducts(products);
updateCartCount();
