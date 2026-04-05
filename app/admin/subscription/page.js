'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function SubscriptionManagement() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [paymentGateway, setPaymentGateway] = useState('stripe'); // 'stripe' or 'razorpay'
  const router = useRouter();

  const subscriptionPlans = {
    basic: {
      name: 'Basic Plan',
      price: '₹2,499',
      priceValue: 2499,
      period: 'per month',
      description: 'Perfect for small organizations',
      features: ['5 Admins', '50 Exams', '1,000 Students', 'Email Support', 'Basic Analytics'],
      color: '#3b82f6',
      popular: false
    },
    premium: {
      name: 'Premium Plan',
      price: '₹8,499',
      priceValue: 8499,
      period: 'per month',
      description: 'Advanced features for growing organizations',
      features: ['15 Admins', '200 Exams', '5,000 Students', 'Priority Support', 'Advanced Analytics', 'Custom Branding'],
      color: '#8b5cf6',
      popular: true
    },
    enterprise: {
      name: 'Enterprise Plan',
      price: '₹24,999',
      priceValue: 24999,
      period: 'per month',
      description: 'Full-scale solution for large organizations',
      features: ['50 Admins', '1,000 Exams', '25,000 Students', '24/7 Support', 'Custom Features', 'API Access', 'White-label Solution'],
      color: '#dc2626',
      popular: false
    }
  };

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Verify token and get user info
    fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        if (data.user.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(data.user);
        fetchSubscriptionData(token);
        
        // Check for Stripe payment success
        checkStripePaymentSuccess(token);
      } else {
        router.push('/admin/login');
      }
    })
    .catch(() => router.push('/admin/login'));
  }, [router]);

  const checkStripePaymentSuccess = async (token) => {
    // Check if redirected from Stripe with session_id
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (canceled) {
      setMessage('Payment was cancelled. Please try again.');
      // Clean URL
      window.history.replaceState({}, '', '/admin/subscription');
      return;
    }

    if (success && sessionId) {
      setMessage('Processing payment...');
      
      try {
        // Verify the session and update subscription
        const response = await fetch('/api/payment/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage('✅ Payment successful! Subscription upgraded.');
          // Refresh subscription data
          setTimeout(() => {
            fetchSubscriptionData(token);
          }, 1000);
        } else {
          setMessage(data.message || 'Failed to verify payment. Please contact support.');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setMessage('Error verifying payment. Please contact support.');
      }

      // Clean URL
      window.history.replaceState({}, '', '/admin/subscription');
    }
  };

  const fetchSubscriptionData = async (token) => {
    try {
      const response = await fetch('/api/admin/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (plan) => {
    setPaymentPlan(plan);
    setShowPaymentModal(true);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setUpgrading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');

      if (paymentGateway === 'stripe') {
        // Stripe Payment Flow
        const response = await fetch('/api/payment/stripe/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ plan: paymentPlan })
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || 'Failed to create checkout session');
          setUpgrading(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;

      } else {
        // Razorpay Payment Flow (existing code)
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setMessage('Failed to load payment gateway. Please try again.');
          setUpgrading(false);
          return;
        }

        const amount = subscriptionPlans[paymentPlan].priceValue;

        const orderResponse = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'INR',
            plan: paymentPlan
          })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
          setMessage(orderData.message || 'Failed to create payment order');
          setUpgrading(false);
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'ExamEye',
          description: `${subscriptionPlans[paymentPlan].name} Subscription`,
          order_id: orderData.orderId,
          handler: async function (response) {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              const subscriptionResponse = await fetch('/api/admin/subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  subscriptionPlan: paymentPlan,
                  paymentId: verifyData.paymentId,
                  paymentCompleted: true
                })
              });

              const subscriptionData = await subscriptionResponse.json();

              if (subscriptionResponse.ok) {
                setMessage('Payment successful! Subscription upgraded.');
                setShowPaymentModal(false);
                fetchSubscriptionData(token);
              } else {
                setMessage(subscriptionData.message || 'Failed to upgrade subscription');
              }
            } else {
              setMessage('Payment verification failed');
            }
            setUpgrading(false);
            setPaymentPlan(null);
          },
          prefill: {
            name: user?.username || '',
            email: user?.email || '',
            contact: company?.phone || ''
          },
          theme: {
            color: subscriptionPlans[paymentPlan].color
          },
          modal: {
            ondismiss: function() {
              setUpgrading(false);
              setMessage('Payment cancelled');
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }

    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Payment failed. Please try again.');
      setUpgrading(false);
      setPaymentPlan(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return <div className="loading">Loading subscription information...</div>;
  }

  return (
    <div className="admin-background">
      {/* Payment Modal */}
      {showPaymentModal && paymentPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ maxWidth: '500px', padding: '2.5rem', margin: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
              <span>💳</span>
              Complete Payment
            </h3>
            
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>Plan:</span>
                <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>{subscriptionPlans[paymentPlan].name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>Amount:</span>
                <span style={{ fontWeight: '700', fontSize: '1.5rem', color: subscriptionPlans[paymentPlan].color }}>
                  {subscriptionPlans[paymentPlan].price}
                  <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#6b7280' }}> {subscriptionPlans[paymentPlan].period}</span>
                </span>
              </div>

              {/* Payment Gateway Selection */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: '#374151' }}>
                  Select Payment Method:
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentGateway('stripe')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: paymentGateway === 'stripe' ? '2px solid #635BFF' : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: paymentGateway === 'stripe' ? '#F6F5FF' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>💳</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: paymentGateway === 'stripe' ? '#635BFF' : '#6b7280' }}>
                      Stripe
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                      Card Payment
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPaymentGateway('razorpay')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: paymentGateway === 'razorpay' ? '2px solid #3395FF' : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: paymentGateway === 'razorpay' ? '#EBF5FF' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🇮🇳</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: paymentGateway === 'razorpay' ? '#3395FF' : '#6b7280' }}>
                      Razorpay
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                      UPI, Card, Net Banking
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#374151' }}>Features included:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                  {subscriptionPlans[paymentPlan].features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#047857', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔒</span>
                <div>
                  <strong>Secure Payment:</strong> Powered by Razorpay. Your payment information is encrypted and secure.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentPlan(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={upgrading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayment}
                className="btn btn-primary"
                style={{ flex: 1, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 15px rgba(5,150,105,0.3)' }}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye Admin</Link>
            <nav className="nav-links">
              <Link href="/admin">Dashboard</Link>
              <span>Welcome, {user?.username}</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '2rem', fontWeight: '700' }}>
              <span>💳</span>
              Subscription Management
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Manage your organization's subscription plan</p>
          </div>

          {/* Current Subscription Status */}
          {company && (
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span>
                Current Subscription
              </h3>
              
              <div className="grid grid-2" style={{ gap: '2rem' }}>
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Company</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{company.name}</div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Current Plan</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {company.subscriptionPlan.replace('_', ' ')}
                      </span>
                      <span style={{ 
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        background: company.subscriptionStatus === 'active' ? '#ecfdf5' : 
                                   company.subscriptionStatus === 'trial' ? '#fef3c7' : '#fef2f2',
                        color: company.subscriptionStatus === 'active' ? '#059669' : 
                               company.subscriptionStatus === 'trial' ? '#92400e' : '#dc2626'
                      }}>
                        {company.subscriptionStatus === 'trial' ? 'Free Trial' : 
                         company.subscriptionStatus === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </div>
                  </div>

                  {company.subscriptionStatus === 'trial' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Trial Ends</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: company.isTrialExpired ? '#dc2626' : '#f59e0b' }}>
                        {formatDate(company.trialEndDate)}
                        {!company.isTrialExpired && (
                          <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                            ({getDaysRemaining(company.trialEndDate)} days remaining)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {company.subscriptionEndDate && company.subscriptionStatus === 'active' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Next Billing Date</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                        {formatDate(company.subscriptionEndDate)}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem' }}>Current Limits</div>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>👥</span>
                        Administrators
                      </span>
                      <span style={{ fontWeight: '600' }}>{company.maxAdmins}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📝</span>
                        Exams
                      </span>
                      <span style={{ fontWeight: '600' }}>{company.maxExams}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎓</span>
                        Students
                      </span>
                      <span style={{ fontWeight: '600' }}>{company.maxStudents.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {(company.subscriptionStatus === 'trial' || company.isTrialExpired) && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: company.isTrialExpired ? '#fef2f2' : '#fef3c7', 
                  borderRadius: '8px',
                  border: `1px solid ${company.isTrialExpired ? '#fecaca' : '#fde68a'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>{company.isTrialExpired ? '⚠️' : '⏰'}</span>
                    <span style={{ fontWeight: '600', color: company.isTrialExpired ? '#dc2626' : '#92400e' }}>
                      {company.isTrialExpired ? 'Trial Expired' : 'Trial Period Active'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: company.isTrialExpired ? '#dc2626' : '#92400e' }}>
                    {company.isTrialExpired 
                      ? 'Your free trial has expired. Please upgrade to continue using ExamEye.'
                      : `Your free trial ends on ${formatDate(company.trialEndDate)}. Upgrade now to avoid service interruption.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Admin Code Information */}
          {company && (
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔐</span>
                Admin Code Status
              </h3>
              
              {company.adminCode ? (
                <div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Admin Code</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        fontFamily: 'monospace',
                        background: '#f3f4f6',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        letterSpacing: '1px'
                      }}>
                        {company.adminCode.code}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Expires On</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                        {formatDate(company.adminCode.expiresAt)}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Days Remaining</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600',
                        color: company.adminCode.isExpired ? '#dc2626' : 
                               company.adminCode.isExpiringSoon ? '#f59e0b' : '#059669'
                      }}>
                        {company.adminCode.isExpired ? 'Expired' : `${company.adminCode.daysRemaining} days`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin Code Status Alert */}
                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: '8px',
                    background: company.adminCode.isExpired ? '#fef2f2' : 
                               company.adminCode.isExpiringSoon ? '#fef3c7' : '#ecfdf5',
                    border: `1px solid ${company.adminCode.isExpired ? '#fecaca' : 
                                        company.adminCode.isExpiringSoon ? '#fde68a' : '#d1fae5'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span>
                        {company.adminCode.isExpired ? '🚫' : 
                         company.adminCode.isExpiringSoon ? '⚠️' : '✅'}
                      </span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: company.adminCode.isExpired ? '#dc2626' : 
                               company.adminCode.isExpiringSoon ? '#92400e' : '#059669'
                      }}>
                        {company.adminCode.isExpired ? 'Admin Code Expired' : 
                         company.adminCode.isExpiringSoon ? 'Admin Code Expiring Soon' : 'Admin Code Active'}
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.9rem', 
                      color: company.adminCode.isExpired ? '#dc2626' : 
                             company.adminCode.isExpiringSoon ? '#92400e' : '#047857'
                    }}>
                      {company.adminCode.isExpired 
                        ? 'Your admin code has expired. New employees cannot register as administrators. Contact your super admin to generate a new code.'
                        : company.adminCode.isExpiringSoon 
                        ? `Your admin code expires in ${company.adminCode.daysRemaining} days. Consider requesting a new code from your super admin.`
                        : `Your admin code is valid for ${company.adminCode.daysRemaining} more days. New employees can use this code to register as administrators.`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫</div>
                  <h4 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>No Active Admin Code</h4>
                  <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>
                    Your company doesn't have an active admin code. Contact your super admin to generate one for new employee registrations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Available Plans */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚀</span>
              Available Plans
            </h3>
            
            <div className="grid grid-3" style={{ gap: '1.5rem' }}>
              {Object.entries(subscriptionPlans).map(([key, plan]) => (
                <div 
                  key={key}
                  style={{ 
                    border: plan.popular ? `2px solid ${plan.color}` : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    position: 'relative',
                    background: company?.subscriptionPlan === key ? '#f9fafb' : 'white'
                  }}
                >
                  {plan.popular && (
                    <div style={{ 
                      position: 'absolute',
                      top: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: plan.color,
                      color: 'white',
                      padding: '0.25rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      Most Popular
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h4 style={{ color: plan.color, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                      {plan.name}
                    </h4>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: plan.color, marginBottom: '0.25rem' }}>
                      {plan.price}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      {plan.period}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      {plan.description}
                    </p>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        marginBottom: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <span style={{ color: plan.color }}>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {company?.subscriptionPlan === key ? (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgradeClick(key)}
                      disabled={upgrading}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: plan.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: upgrading ? 'not-allowed' : 'pointer',
                        opacity: upgrading ? 0.7 : 1
                      }}
                    >
                      Upgrade Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div style={{ 
              padding: '1rem', 
              marginTop: '1rem',
              borderRadius: '8px',
              background: message.includes('success') ? '#ecfdf5' : '#fef2f2',
              color: message.includes('success') ? '#059669' : '#dc2626',
              border: `1px solid ${message.includes('success') ? '#10b981' : '#ef4444'}`
            }}>
              {message}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/admin" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}