import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const socket = io('https://freshveg-backend-443z.onrender.com');
const steps = ["Order Placed", "Packed & Ready", "Out for Delivery", "Delivered"];

function ChangeMapView({ coords }) {
  const map = useMap();
  map.setView(coords, map.getZoom());
  return null;
}

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [vegetableStock, setVegetableStock] = useState([]);
  const [cart, setCart] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tracking States
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [deliveryStep, setDeliveryStep] = useState(0);
  const [driverLocation, setDriverLocation] = useState([18.2949, 83.8938]);
  const [notification, setNotification] = useState('');

  // Admin Portal & View States
  const [viewAdmin, setViewAdmin] = useState(false);
  const [newVegName, setNewVegName] = useState('');
  const [newVegPrice, setNewVegPrice] = useState('');
  const [newVegUnit, setNewVegUnit] = useState('kg');
  const [newVegIcon, setNewVegIcon] = useState('🥦');

  // Customer Reviews & History States
  const [reviews, setReviews] = useState([
    { user: 'Ramesh', comment: 'The tomatoes are incredibly fresh!', rating: 5 },
    { user: 'Sita', comment: 'Fast delivery, good packaging.', rating: 4 }
  ]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [pastOrders, setPastOrders] = useState([]);
  const [viewOrders, setViewOrders] = useState(false);

  const fetchInventory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vegetables');
      const data = await response.json();
      setVegetableStock(data);
    } catch (error) {
      console.error("Failed to fetch inventory");
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    socket.on('driver_location_update', (data) => {
      setDeliveryStep(data.step);
      setDriverLocation([data.lat, data.lng]);
      triggerNotification(`📍 Driver Location Updated: [${data.statusName}]`);
    });

    return () => {
      socket.off('driver_location_update');
    };
  }, []);

  const triggerNotification = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        if (!isSignUp) setIsLoggedIn(true);
        else { setIsSignUp(false); setPassword(''); }
      } else {
        setMessage(data.message || 'Authentication failed');
      }
    } catch (error) {
      setMessage('Cannot connect to server.');
    }
  };

  const fetchPastOrders = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${username}`);
      const data = await response.json();
      setPastOrders(data);
      setViewOrders(true);
      setViewAdmin(false);
    } catch (error) {
      triggerNotification("❌ Could not load past orders");
    }
  };

  // Admin Actions
  const handleAddVegetable = async (e) => {
    e.preventDefault();
    if (!newVegName || !newVegPrice) return;

    try {
      const response = await fetch('http://localhost:5000/api/vegetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVegName,
          price: newVegPrice,
          unit: newVegUnit,
          image: newVegIcon,
          stockCount: 50
        })
      });

      if (response.ok) {
        triggerNotification(`🌱 Successfully added ${newVegName}!`);
        setNewVegName('');
        setNewVegPrice('');
        fetchInventory();
      } else {
        triggerNotification("❌ Failed to add product.");
      }
    } catch (error) {
      triggerNotification("❌ Server connection error.");
    }
  };

  const handleDeleteVegetable = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/vegetables/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        triggerNotification("🗑️ Item deleted from catalog.");
        fetchInventory();
      } else {
        triggerNotification("❌ Failed to delete product.");
      }
    } catch (error) {
      triggerNotification("❌ Server connection error.");
    }
  };

  const addToCart = (id) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    const item = vegetableStock.find(v => v.id === id);
    if (item) triggerNotification(`🛒 Added ${item.name} to basket!`);
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[id] > 1) updated[id] -= 1;
      else delete updated[id];
      return updated;
    });
  };

  const getTotalPrice = () => {
    return Object.keys(cart).reduce((total, id) => {
      const item = vegetableStock.find(v => v.id === parseInt(id));
      return total + (item ? item.price * cart[id] : 0);
    }, 0);
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const processPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const cartItems = Object.keys(cart).map(id => {
      const item = vegetableStock.find(v => v.id === parseInt(id));
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: cart[id]
      };
    });

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username || 'Guest User',
          items: cartItems,
          totalAmount: getTotalPrice(),
          paymentMode: 'UPI / Card'
        })
      });

      const resData = await response.json();

      if (response.ok) {
        setShowPaymentModal(false);
        setPaymentSuccess(true);
        setOrderPlaced(true);
        setDeliveryStep(0);
        setActiveOrderId(resData.order._id);
        
        socket.emit('start_delivery_tracking', {
          orderId: resData.order._id,
          username: username
        });

        triggerNotification("💳 Payment Successful! GPS Tracking active.");
      } else {
        triggerNotification("❌ Failed to record order.");
      }
    } catch (error) {
      triggerNotification("❌ Server connection error during checkout.");
    }

    setIsProcessing(false);
  };

  const submitReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setReviews([...reviews, { user: username || 'Anonymous', comment: newComment, rating: parseInt(newRating) }]);
    setNewComment('');
    triggerNotification("⭐ Thank you for your feedback!");
  };

  if (isLoggedIn) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>

        {notification && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#333', color: '#fff', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 'bold' }}>
            {notification}
          </div>
        )}

        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #4CAF50', paddingBottom: '15px' }}>
          <h2 style={{ color: '#4CAF50', margin: 0 }}>🌱 FreshVegg Hub Dashboard</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', marginRight: '10px' }}>🛒 <strong>{totalItems} items</strong> (₹{getTotalPrice()})</span>
            
            <button onClick={() => { setViewAdmin(!viewAdmin); setViewOrders(false); }} style={{ padding: '8px 12px', backgroundColor: '#673AB7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {viewAdmin ? '🛒 Back to Shop' : '🛠️ Admin Portal'}
            </button>

            <button onClick={() => { if (!viewOrders) fetchPastOrders(); else setViewOrders(false); }} style={{ padding: '8px 12px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {viewOrders ? '🛒 Shop' : '📜 Orders'}
            </button>

            <button onClick={() => { setIsLoggedIn(false); setOrderPlaced(false); setCart({}); setPaymentSuccess(false); setViewOrders(false); setViewAdmin(false); }} style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Admin Inventory Management View */}
        {viewAdmin && (
          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px', border: '1px solid #ce93d8' }}>
            <h3 style={{ marginTop: 0, color: '#4a148c' }}>🛠️ Inventory Management (MongoDB Live Portal)</h3>
            
            {/* Add Item Form */}
            <form onSubmit={handleAddVegetable} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '6px' }}>
              <input type="text" placeholder="Vegetable Name (e.g. Broccoli)" value={newVegName} onChange={(e) => setNewVegName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }} />
              <input type="number" placeholder="Price (₹)" value={newVegPrice} onChange={(e) => setNewVegPrice(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }} />
              <select value={newVegUnit} onChange={(e) => setNewVegUnit(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="kg">kg</option>
                <option value="bunch">bunch</option>
                <option value="pack">pack</option>
              </select>
              <select value={newVegIcon} onChange={(e) => setNewVegIcon(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '18px' }}>
                <option value="🥦">🥦 Broccoli</option>
                <option value="🧅">🧅 Onion</option>
                <option value="🌽">🌽 Corn</option>
                <option value="🥒">🥒 Cucumber</option>
                <option value="🧄">🧄 Garlic</option>
                <option value="🍆">🍆 Eggplant</option>
              </select>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#673AB7', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Product</button>
            </form>

            {/* Current Products Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#e1bee7', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Icon</th>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>Price</th>
                  <th style={{ padding: '10px' }}>Unit</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {vegetableStock.map((veg) => (
                  <tr key={veg.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontSize: '24px' }}>{veg.image}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{veg.name}</td>
                    <td style={{ padding: '10px' }}>₹{veg.price}</td>
                    <td style={{ padding: '10px' }}>{veg.unit}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => handleDeleteVegetable(veg.id)} style={{ padding: '6px 12px', backgroundColor: '#e53935', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order History View */}
        {viewOrders && (
          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0 }}>📦 Your Past Orders ({pastOrders.length})</h3>
            {pastOrders.length === 0 ? <p>No past orders found.</p> : pastOrders.map((ord) => (
              <div key={ord._id} style={{ borderBottom: '1px solid #eee', padding: '15px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span><strong>Order ID:</strong> {ord._id}</span>
                  <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>₹{ord.totalAmount}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Status: <strong>{ord.orderStatus}</strong> | Date: {new Date(ord.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Regular Storefront View */}
        {!viewAdmin && !viewOrders && (
          <>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '20px' }}>
              <div style={{ flex: '2', minWidth: '600px' }}>
                <h3>Available Fresh Vegetables</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                  {vegetableStock.map(veg => (
                    <div key={veg.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
                      <span style={{ fontSize: '50px', display: 'block' }}>{veg.image}</span>
                      <h4>{veg.name}</h4>
                      <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>₹{veg.price} / {veg.unit}</p>
                      <button onClick={() => addToCart(veg.id)} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 12px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Basket Card */}
              <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9', height: 'fit-content' }}>
                <h3>Your Basket</h3>
                {totalItems === 0 ? <p>Your basket is empty.</p> : (
                  <div>
                    {Object.keys(cart).map(id => {
                      const item = vegetableStock.find(v => v.id === parseInt(id));
                      if (!item) return null;
                      return (
                        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div>{item.name} × {cart[id]}</div>
                          <div>₹{item.price * cart[id]}</div>
                        </div>
                      );
                    })}
                    <hr />
                    <div style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'right' }}>Total: ₹{getTotalPrice()}</div>
                    {!orderPlaced && (
                      <button onClick={() => setShowPaymentModal(true)} style={{ marginTop: '15px', width: '100%', padding: '12px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Proceed to Checkout
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LIVE GPS DRIVER MAP SECTION */}
            {orderPlaced && (
              <div style={{ marginTop: '30px', padding: '20px', border: '2px solid #2196F3', borderRadius: '10px', backgroundColor: '#f0f8ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#2196F3' }}>🛵 Real-Time Live Delivery Map</h3>
                  <span>Status: <strong>{steps[deliveryStep]}</strong></span>
                </div>

                <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
                  <MapContainer center={driverLocation} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={driverLocation}>
                      <Popup>
                        🚴 <strong>Delivery Partner</strong> <br /> Current Status: {steps[deliveryStep]}
                      </Popup>
                    </Marker>
                    <ChangeMapView coords={driverLocation} />
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <h3>💬 Customer Interaction & Reviews</h3>
              <form onSubmit={submitReview} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" placeholder="Share your experience..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <select value={newRating} onChange={(e) => setNewRating(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="5">⭐⭐⭐⭐⭐</option>
                  <option value="4">⭐⭐⭐⭐</option>
                  <option value="3">⭐⭐⭐</option>
                </select>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
              </form>
              <div>
                {reviews.map((rev, i) => (
                  <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9', marginBottom: '5px' }}>
                    <strong>{rev.user}</strong> <span>{'⭐'.repeat(rev.rating)}</span>
                    <p style={{ margin: '5px 0 0 0', color: '#555' }}>{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '350px' }}>
              <h3>💳 FreshVegg Checkout</h3>
              <p>Total: <strong>₹{getTotalPrice()}</strong></p>
              <form onSubmit={processPayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                  <option>UPI (GooglePay / PhonePe)</option>
                  <option>Cash on Delivery</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#bbb', color: '#fff', border: 'none', borderRadius: '4px' }}>Cancel</button>
                  <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '10px', backgroundColor: isProcessing ? '#ccc' : '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                    {isProcessing ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#4CAF50' }}>🌱 FreshVegg Hub Security</h2>
      <p style={{ textAlign: 'center' }}>{isSignUp ? 'Create an account' : 'Sign in to your account'}</p>
      {message && <div style={{ padding: '10px', margin: '10px 0', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', textAlign: 'center' }}>{message}</div>}
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        <span onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} style={{ color: '#2196F3', cursor: 'pointer' }}>{isSignUp ? 'Back to Login' : 'Register an Account'}</span>
      </p>
    </div>
  );
}

export default App;