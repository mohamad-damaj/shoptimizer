"use client"
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [storefrontUrl, setStorefrontUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [orbs, setOrbs] = useState([]);

  useEffect(() => {
    const generatedOrbs = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 6 + Math.random() * 4,
      size: 20 + Math.random() * 30,
    }));
    setOrbs(generatedOrbs);
  }, []);

  const handleSubmit = () => {
    if (!storefrontUrl || !accessToken) return;
    const encodedUrl = encodeURIComponent(storefrontUrl);
    const encodedToken = encodeURIComponent(accessToken);
    window.location.href = `/scene?storefront_url=${encodedUrl}&access_token=${encodedToken}`;
  };

  return (
    <div style={styles.container}>
      {/* Floating orbs background */}
      {orbs.map((orb) => {
        const colors = ['#cba987', '#dba392', '#c9b891', '#d4a574'];
        return (
          <div
            key={orb.id}
            style={{
              position: 'absolute',
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              backgroundColor: colors[orb.id % 4],
              borderRadius: '50%',
              filter: 'blur(40px)',
              opacity: 0.4,
              animation: `float ${orb.duration}s ease-in-out ${orb.delay}s infinite`,
            }}
          />
        );
      })}
      
      {/* Large decorative blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(20px); }
        }
        
        @keyframes blobAnimation1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
        
        @keyframes blobAnimation2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.95); }
          66% { transform: translate(20px, -30px) scale(1.1); }
        }
        
        @keyframes blobAnimation3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, 30px) scale(1.05); }
          66% { transform: translate(-30px, -20px) scale(1); }
        }
      `}</style>

      <div style={styles.content}>
        <div style={styles.textCenter}>
          <h1 style={styles.title}>Royal Access</h1>
          <div style={styles.divider}>
            <div style={styles.line}></div>
            <div style={styles.dot}></div>
            <div style={styles.line}></div>
          </div>
        </div>
        
        <div style={styles.inputsContainer}>
          <input
            type="text"
            value={storefrontUrl}
            onChange={(e) => setStorefrontUrl(e.target.value)}
            placeholder="myshop.myshopify.com"
            style={styles.input}
          />
          <input
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Access Token"
            style={styles.input}
          />
        </div>
        
        <button
          onClick={handleSubmit}
          style={styles.button}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d4a574';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#cba987';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
        >
          <span style={styles.dot2}></span>
          ENTER REALM
          <span style={styles.dot2}></span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    backgroundColor: '#e8d8c0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    maxWidth: '420px',
    width: '100%',
    padding: '32px',
    position: 'relative',
    zIndex: 10,
  },
  textCenter: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '48px',
    fontWeight: '500',
    fontFamily: 'serif',
    color: '#2a2520',
    margin: 0,
    letterSpacing: '1px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  line: {
    width: '64px',
    height: '1px',
    backgroundColor: '#9c8a76',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#9c8a76',
  },
  inputsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    width: '100%',
    padding: '16px 24px',
    backgroundColor: 'rgba(248, 245, 240, 0.7)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '8px',
    fontSize: '15px',
    color: '#2a2520',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backdropFilter: 'blur(10px)',
  },
  button: {
    width: '100%',
    padding: '16px 32px',
    backgroundColor: '#cba987',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  dot2: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#fff',
  },
  blob1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    backgroundColor: '#dba392',
    borderRadius: '38% 62% 58% 42% / 58% 41% 59% 42%',
    opacity: 0.35,
    filter: 'blur(80px)',
    top: '-100px',
    right: '-150px',
    animation: 'blobAnimation1 25s ease-in-out infinite',
    zIndex: 1,
  },
  blob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    backgroundColor: '#c9b891',
    borderRadius: '42% 58% 42% 58% / 62% 38% 62% 38%',
    opacity: 0.3,
    filter: 'blur(80px)',
    bottom: '-100px',
    left: '-100px',
    animation: 'blobAnimation2 30s ease-in-out infinite',
    zIndex: 1,
  },
  blob3: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    backgroundColor: '#cba987',
    borderRadius: '58% 42% 62% 38% / 38% 62% 38% 62%',
    opacity: 0.25,
    filter: 'blur(70px)',
    top: '20%',
    left: '-100px',
    animation: 'blobAnimation3 28s ease-in-out infinite',
    zIndex: 1,
  },
};