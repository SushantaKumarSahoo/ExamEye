'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';

// Counter animation hook
function useCountUp(end, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime;
    let animationFrame;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, shouldStart]);
  
  return count;
}

// Intersection Observer hook for triggering animations
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.3, ...options });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);
  
  return [ref, isInView];
}

// Smooth scroll function
function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// Stats Counter Component
function StatCard({ icon, end, suffix, label, delay = 0 }) {
  const [ref, isInView] = useInView();
  const count = useCountUp(end, 2000, isInView);
  
  return (
    <div ref={ref} className="card" style={{ 
      padding: '2rem',
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(20px)',
      transition: `all 0.6s ease ${delay}ms`
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
        {count.toLocaleString()}{suffix}
      </h3>
      <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>{label}</p>
    </div>
  );
}

// Feature Card Component with animation
function FeatureCard({ icon, title, description, delay = 0 }) {
  const [ref, isInView] = useInView();
  
  return (
    <div 
      ref={ref}
      className="card clickable" 
      style={{ 
        padding: '2rem',
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
        {title}
      </h3>
      <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      // Verify token and get user info
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            // Redirect based on role
            if (data.user.role === 'admin') {
              router.push('/admin');
            } else if (data.user.role === 'superadmin') {
              router.push('/superadmin');
            } else {
              // Students should use the secure browser, not the website
              Cookies.remove('token');
              alert('Students must use the ExamEye Secure Browser to access exams. Please download and install the secure browser application.');
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="page-background">
      {/* Floating Navbar */}
      <header style={{ 
        position: 'fixed',
        top: isScrolled ? '1rem' : '0',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white',
        padding: isScrolled ? '0.75rem 2rem' : '1.5rem 0',
        borderRadius: isScrolled ? '50px' : '0',
        boxShadow: isScrolled ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
        zIndex: 1000,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isScrolled ? 'auto' : '100%',
        minWidth: isScrolled ? '700px' : 'auto'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isScrolled ? '0' : '0 20px',
          width: '100%'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: isScrolled ? '1.5rem' : '2rem'
          }}>
            <div style={{ 
              color: 'white',
              fontSize: isScrolled ? '1.3rem' : '2rem',
              fontWeight: '800',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.4s',
              whiteSpace: 'nowrap'
            }}>
              <span className="eye-blink" style={{ fontSize: isScrolled ? '1.3rem' : '2rem' }}>👁️</span>
              ExamEye
            </div>
            <nav style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: isScrolled ? '0.75rem' : '1.5rem',
              transition: 'gap 0.4s'
            }}>
              <a 
                href="#features" 
                onClick={(e) => { e.preventDefault(); smoothScrollTo('features'); }}
                style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  textDecoration: 'none', 
                  padding: '0.5rem 1rem', 
                  cursor: 'pointer', 
                  transition: 'color 0.3s',
                  fontSize: isScrolled ? '0.9rem' : '1rem',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.9)'}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={(e) => { e.preventDefault(); smoothScrollTo('how-it-works'); }}
                style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  textDecoration: 'none', 
                  padding: '0.5rem 1rem', 
                  cursor: 'pointer', 
                  transition: 'color 0.3s',
                  fontSize: isScrolled ? '0.9rem' : '1rem',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.9)'}
              >
                How It Works
              </a>
              <a 
                href="#security" 
                onClick={(e) => { e.preventDefault(); smoothScrollTo('security'); }}
                style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  textDecoration: 'none', 
                  padding: '0.5rem 1rem', 
                  cursor: 'pointer', 
                  transition: 'color 0.3s',
                  fontSize: isScrolled ? '0.9rem' : '1rem',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.9)'}
              >
                Security
              </a>
              <Link href="/admin/login" className="btn" style={{ 
                background: 'white', 
                color: '#1f2937',
                padding: isScrolled ? '0.5rem 1rem' : '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: isScrolled ? '0.85rem' : '1rem',
                transition: 'all 0.4s',
                whiteSpace: 'nowrap',
                textDecoration: 'none'
              }}>
                Admin Login
              </Link>
              <Link href="/superadmin/login" className="btn" style={{ 
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
                color: 'white',
                padding: isScrolled ? '0.5rem 1rem' : '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: isScrolled ? '0.85rem' : '1rem',
                transition: 'all 0.4s',
                whiteSpace: 'nowrap',
                textDecoration: 'none'
              }}>
                Super Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white',
        padding: '8rem 20px 6rem',
        textAlign: 'center',
        marginTop: '0'
      }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="fade-in-up">
            <h1 style={{ 
              fontSize: '4rem', 
              marginBottom: '1.5rem', 
              fontWeight: '800',
              lineHeight: '1.2',
              color: 'white'
            }}>
              Secure Online Examination Platform
            </h1>
            <p style={{ 
              fontSize: '1.5rem', 
              marginBottom: '3rem', 
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '400',
              lineHeight: '1.6',
              maxWidth: '800px',
              margin: '0 auto 3rem'
            }}>
              Conduct fair, secure, and efficient online exams with advanced anti-cheating technology and real-time monitoring
            </p>
            
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth" className="btn" style={{
                background: 'white',
                color: '#1f2937',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                borderRadius: '12px',
                fontWeight: '600',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                textDecoration: 'none'
              }}>
                <span style={{ marginRight: '0.5rem' }}>🚀</span>
                Get Started
              </Link>
              <a 
                href="#features" 
                onClick={(e) => { e.preventDefault(); smoothScrollTo('features'); }}
                className="btn" 
                style={{
                  background: 'transparent',
                  color: 'white',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  borderRadius: '12px',
                  fontWeight: '600',
                  border: '2px solid white',
                  cursor: 'pointer'
                }}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '4rem 20px', background: '#f9fafb' }}>
        <div className="container">
          <div className="grid" style={{ 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '2rem',
            textAlign: 'center'
          }}>
            <StatCard icon="🎓" end={10000} suffix="+" label="Students Examined" delay={0} />
            <StatCard icon="🏢" end={500} suffix="+" label="Institutions" delay={100} />
            <StatCard icon="📊" end={99.9} suffix="%" label="Uptime" delay={200} />
            <StatCard icon="🔒" end={100} suffix="%" label="Secure" delay={300} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '6rem 20px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
              Powerful Features for Modern Exams
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#6b7280', maxWidth: '700px', margin: '0 auto' }}>
              Everything you need to conduct secure, efficient, and fair online examinations
            </p>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <FeatureCard 
              icon="🔒"
              title="Secure Browser"
              description="Dedicated secure browser with advanced anti-cheating measures, preventing unauthorized access and ensuring exam integrity."
              delay={0}
            />
            <FeatureCard 
              icon="📊"
              title="Excel Integration"
              description="Easily upload questions and student data via Excel files. Bulk operations made simple and efficient."
              delay={100}
            />
            <FeatureCard 
              icon="⚡"
              title="Instant Results"
              description="Automatic grading and immediate result generation. Get detailed analytics and performance insights instantly."
              delay={200}
            />
            <FeatureCard 
              icon="👁️"
              title="Real-time Monitoring"
              description="Track exam progress in real-time. Monitor student activities and detect suspicious behavior instantly."
              delay={300}
            />
            <FeatureCard 
              icon="🎯"
              title="Custom Instructions"
              description="Create customized exam instructions and rules. Require student acknowledgment before exam starts."
              delay={400}
            />
            <FeatureCard 
              icon="📈"
              title="Analytics Dashboard"
              description="Comprehensive analytics and reporting. Track performance trends and identify areas for improvement."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ padding: '6rem 20px', background: '#f9fafb' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#6b7280', maxWidth: '700px', margin: '0 auto' }}>
              Simple, secure, and efficient exam process
            </p>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '700',
                margin: '0 auto 1.5rem'
              }}>
                1
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Create Exam
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                Admins create exams, upload questions via Excel, and set exam parameters including duration and instructions.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '700',
                margin: '0 auto 1.5rem'
              }}>
                2
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Invite Students
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                System generates unique credentials for each student and sends them via email automatically.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '700',
                margin: '0 auto 1.5rem'
              }}>
                3
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Take Exam
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                Students use the secure browser to login, read instructions, and complete the exam in a monitored environment.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '700',
                margin: '0 auto 1.5rem'
              }}>
                4
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Get Results
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                Automatic grading provides instant results with detailed analytics and performance reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" style={{ padding: '6rem 20px' }}>
        <div className="container">
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
                Enterprise-Grade Security
              </h2>
              <p style={{ fontSize: '1.2rem', color: '#6b7280', maxWidth: '700px', margin: '0 auto' }}>
                Multi-layered security measures to ensure exam integrity
              </p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  🔐 Browser Lockdown
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Dedicated secure browser prevents tab switching, copy-paste, screenshots, and unauthorized access.
                </p>
              </div>

              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  👁️ Activity Monitoring
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Real-time monitoring of student activities with automatic detection of suspicious behavior.
                </p>
              </div>

              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  🔑 Unique Credentials
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Temporary, exam-specific credentials that expire automatically after exam completion.
                </p>
              </div>

              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  📝 Question Flagging
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Students can flag problematic questions for review, ensuring fair assessment.
                </p>
              </div>

              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  ⏱️ Time Management
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Automatic time tracking with warnings and auto-submission when time expires.
                </p>
              </div>

              <div className="card" style={{ padding: '2rem', borderLeft: '4px solid #1f2937' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                  📊 Audit Trails
                </h4>
                <p style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  Complete audit logs of all exam activities for compliance and review purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '6rem 20px', 
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1.5rem', color: 'white' }}>
            Ready to Transform Your Exams?
          </h2>
          <p style={{ fontSize: '1.3rem', marginBottom: '3rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.7' }}>
            Join hundreds of institutions using ExamEye for secure, efficient online examinations
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth" className="btn" style={{
              background: 'white',
              color: '#1f2937',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              borderRadius: '12px',
              fontWeight: '600',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              textDecoration: 'none'
            }}>
              <span style={{ marginRight: '0.5rem' }}>🚀</span>
              Get Started
            </Link>
            <Link href="/admin/login" className="btn" style={{
              background: 'transparent',
              color: 'white',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              borderRadius: '12px',
              fontWeight: '600',
              border: '2px solid white'
            }}>
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 20px', background: '#1f2937', color: 'rgba(255,255,255,0.8)' }}>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            <div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '1rem',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>👁️</span>
                ExamEye
              </div>
              <p style={{ lineHeight: '1.7', marginBottom: '1rem' }}>
                Secure online examination platform for modern educational institutions.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>Quick Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a 
                  href="#features" 
                  onClick={(e) => { e.preventDefault(); smoothScrollTo('features'); }}
                  style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}
                  onMouseEnter={(e) => e.target.style.color = 'white'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => { e.preventDefault(); smoothScrollTo('how-it-works'); }}
                  style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}
                  onMouseEnter={(e) => e.target.style.color = 'white'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                >
                  How It Works
                </a>
                <a 
                  href="#security" 
                  onClick={(e) => { e.preventDefault(); smoothScrollTo('security'); }}
                  style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}
                  onMouseEnter={(e) => e.target.style.color = 'white'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
                >
                  Security
                </a>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>Access</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/admin/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Admin Login</Link>
                <Link href="/superadmin/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Super Admin</Link>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>Contact</h4>
              <p style={{ lineHeight: '1.7' }}>
                For support and inquiries, contact your system administrator.
              </p>
            </div>
          </div>

          <div style={{ 
            marginTop: '3rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <p>© 2024 ExamEye. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
