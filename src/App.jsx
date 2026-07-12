import React, { useState, useEffect } from 'react';
import './App.css';

const vegetableStock = [
  { id: 1, name: 'Fresh Tomato', price: 40, unit: 'kg', image: '🍅' },
  { id: 2, name: 'Organic Potato', price: 30, unit: 'kg', image: '🥔' },
  { id: 3, name: 'Green Spinach', price: 25, unit: 'bunch', image: '🥬' },
  { id: 4, name: 'Fresh Carrot', price: 50, unit: 'kg', image: '🥕' },
];

const steps = ["Order Placed", "Packed & Ready", "Out for Delivery", "Delivered"];

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Cart & Payment States
  const [cart, setCart] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Tracking & Notification States
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [deliveryStep, setDeliveryStep] = useState(0);
  const [notification, setNotification] = useState('');

  // User Interaction States (Feedback loop)
  const [reviews, setReviews] = useState([
    { user: 'Ramesh', comment: 'The tomatoes are incredibly fresh!', rating: 5 },
    { user: 'Sita', comment: 'Fast delivery, good packaging.', rating: 4 }
  ]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);

  // Auto-advance delivery status and trigger alerts
  useEffect(() => {
    let interval;
    if (orderPlaced && deliveryStep < steps.length - 1) {
      interval = setInterval(() => {
        setDeliveryStep((prev) => {
          const nextStep = prev + 1;
          // Trigger a system notification for each status update
          triggerNotification(`🔔 Status Update: Your order is now [${steps[nextStep]}]!`);
          return nextStep;
        });
      }, 5000); 
    }
    return () => clearInterval(interval);
  }, [orderPlaced, deliveryStep]);

  const triggerNotification = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 4000); // Clear notification after 4 seconds
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    
    try {
      // Clean and fixed fetch URL!
     // ✅ Universally accessible cloud backend endpoint
      const backendUrl = `https://veg-shop-backend.onrender.com${endpoint}`;
      const response = await fetch(backendUrl, {
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
        setMessage(data.message || 'Something went wrong');
      }
    } catch (error) {
      setMessage('Cannot connect to the backend server.');
    }
  };

  const addToCart = (id) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    const item = vegetableStock.find(v => v.id === id);
    triggerNotification(`🛒 Added ${item.name} to your basket!`);
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

  const processPayment = (e) => {
    e.preventDefault();
    setShowPaymentModal(false);
    setPaymentSuccess(true);
    setOrderPlaced(true);
    setDeliveryStep(0);
    triggerNotification("💳 Payment Successful! Your order has been registered.");
  };

  const submitReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setReviews([...reviews, { user: username || 'Anonymous', comment: newComment, rating: parseInt(newRating) }]);
    setNewComment('');
    triggerNotification("⭐ Thank you for your feedback!");
  };

  // ----------------------------------------------------
  // DASHBOARD RENDER (Logged In)
  // ----------------------------------------------------
  if (isLoggedIn) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
        
        {/* Dynamic Notification Popup Toast */}
        {notification && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#333', color: '#fff', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.5s' }}>
            {notification}
          </div>
        )}

        {/* Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #4CAF50', paddingBottom: '15px' }}>
          <h2 style={{ color: '#4CAF50', margin: 0 }}>🌱 FreshVegg Hub Dashboard</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '18px' }}>🛒 Cart: <strong>{totalItems} items</strong> (₹{getTotalPrice()})</span>
            <button onClick={() => { setIsLoggedIn(false); setOrderPlaced(false); setCart({}); setPaymentSuccess(false); }} style={{ padding: '8px 15px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Checkout & Stock Panel Layout */}
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '20px' }}>
          <div style={{ flex: '2', minWidth: '600px' }}>
            <h3>Available Fresh Vegetables</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
              {vegetableStock.map(veg => (
                <div key={veg.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
                  <span style={{ fontSize: '50px', display: 'block', marginBottom: '10px' }}>{veg.image}</span>
                  <h4 style={{ margin: '5px 0' }}>{veg.name}</h4>
                  <p style={{ color: '#4CAF50', fontWeight: 'bold', margin: '5px 0' }}>₹{veg.price} / {veg.unit}</p>
                  <button onClick={() => addToCart(veg.id)} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 12px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginTop: '10px' }}>
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Sidebar Card */}
          <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9', height: 'fit-content' }}>
            <h3>Your Basket</h3>
            {totalItems === 0 ? (
              <p style={{ color: '#777' }}>Your basket is empty.</p>
            ) : (
              <div>
                {Object.keys(cart).map(id => {
                  const item = vegetableStock.find(v => v.id === parseInt(id));
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                      <div><strong>{item.image} {item.name}</strong><div style={{ fontSize: '12px', color: '#666' }}>₹{item.price} x {cart[id]}</div></div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => removeFromCart(id)} style={{ padding: '2px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                        <span>{cart[id]}</span>
                        <button onClick={() => addToCart(id)} style={{ padding: '2px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold', textAlign: 'right' }}>Total Bill: ₹{getTotalPrice()}</div>
                {!orderPlaced && (
                  <button onClick={() => setShowPaymentModal(true)} style={{ marginTop: '15px', width: '100%', padding: '12px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Proceed to Payment Request
                  </button>
                )}
                {paymentSuccess && <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>✓ Payment Secured</div>}
              </div>
            )}
          </div>
        </div>

        {/* Live Delivery Tracker Grid */}
        {orderPlaced && (
          <div style={{ marginTop: '40px', padding: '25px', border: '2px dashed #2196F3', borderRadius: '10px', backgroundColor: '#eef7ff' }}>
            <h3 style={{ color: '#2196F3', marginTop: 0 }}>📦 Live Order Delivery Tracking</h3>
            <p>Current Dispatch Milestone: <strong>{steps[deliveryStep]}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', position: 'relative' }}>
              <div style={{ content: '""', position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', backgroundColor: '#ccc', zIndex: 1 }}></div>
              <div style={{ content: '""', position: 'absolute', top: '15px', left: '0', width: `${(deliveryStep / (steps.length - 1)) * 100}%`, height: '4px', backgroundColor: '#4CAF50', zIndex: 1, transition: 'width 0.5s ease' }}></div>
              {steps.map((step, idx) => (
                <div key={idx} style={{ textAlign: 'center', zIndex: 2, flex: 1 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: idx <= deliveryStep ? '#4CAF50' : '#fff', border: '3px solid #4CAF50', color: idx <= deliveryStep ? '#fff' : '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 'bold' }}>
                    {idx <= deliveryStep ? '✓' : idx + 1}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '8px', fontWeight: idx === deliveryStep ? 'bold' : 'normal' }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Interaction Module (Reviews & Feedback) */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
          <h3>💬 Customer Interaction & Reviews</h3>
          <form onSubmit={submitReview} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Share your experience about the vegetable quality..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={newRating} onChange={(e) => setNewRating(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="5">⭐⭐⭐⭐⭐</option>
              <option value="4">⭐⭐⭐⭐</option>
              <option value="3">⭐⭐⭐</option>
            </select>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
          </form>
          <div>
            {reviews.map((rev, i) => (
              <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9', marginBottom: '5px', borderRadius: '4px' }}>
                <strong>{rev.user}</strong> <span style={{ color: '#ffb703' }}>{'⭐'.repeat(rev.rating)}</span>
                <p style={{ margin: '5px 0 0 0', color: '#555' }}>{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Payment Gateway Prompt Dialog */}
        {showPaymentModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#2196F3' }}>💳 FreshVegg Secure Payment Request</h3>
              <p>Amount to Pay: <strong>₹{getTotalPrice()}</strong></p>
              <form onSubmit={processPayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Select Payment Mode</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                    <option>UPI (GooglePay / PhonePe)</option>
                    <option>Net Banking</option>
                    <option>Cash on Delivery</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#bbb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Pay Now</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // LOGIN / REGISTRATION SCREEN
  // ----------------------------------------------------
  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center', color: '#4CAF50' }}>🌱 FreshVegg Hub Security</h2>
      <p style={{ textAlign: 'center' }}>{isSignUp ? 'Create an account below' : 'Sign in to access fresh stock'}</p>
      {message && <div style={{ padding: '10px', margin: '10px 0', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', textAlign: 'center' }}>{message}</div>}
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '95%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '95%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <span onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} style={{ color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }}>{isSignUp ? 'Login here' : 'Register here'}</span>
      </p>
    </div>
  );
}

export default App;