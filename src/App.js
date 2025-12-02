import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { Home, TrendingUp, TrendingDown, Calendar, Plus, Wallet, CreditCard, XCircle, CheckCircle, DollarSign } from 'lucide-react';

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Theme Colors - Matching the design
const THEME = {
  bg: '#1a1a1a',
  card: '#2a2a2a',
  cardDark: '#1f1f1f',
  primary: '#7c3aed',
  primaryLight: '#9f7aea',
  secondary: '#60a5fa',
  text: '#ffffff',
  textMuted: '#9ca3af',
  danger: '#ef4444',
  success: '#10b981',
  green: '#22c55e',
  purple: '#8b5cf6',
  blue: '#3b82f6',
};

// Mobile-optimized touch styles
const MOBILE_TOUCH = {
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  minWidth: '44px', // iOS minimum touch target
  minHeight: '44px',
};

// Mobile-optimized input styles
const MOBILE_INPUT = {
  fontSize: '16px', // Prevents zoom on iOS
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
};

// Helper Functions
const formatCurrency = (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val);
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMonthYear = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

// Collection Path Helpers
const getIncomeCollectionPath = (userId) => `users/${userId}/incomes`;
const getExpenseCollectionPath = (userId) => `users/${userId}/expenses`;
const getRecurringTemplateCollectionPath = (userId) => `users/${userId}/recurringTemplates`;

// Constants
const EXPENSE_CATEGORIES = [
  'Software/Tools', 'Rent/Mortgage', 'Utilities', 'Debt Payment', 'Subscription',
  'Marketing', 'Taxes', 'Personal', 'Groceries', 'Other'
];

const INCOME_TYPES = [
  { value: 'RETAINER', label: 'Monthly Retainer' },
  { value: 'WEEKLY_PAY', label: 'Weekly Payout' },
  { value: 'ONE_TIME', label: 'One-Time Project' },
];

// Animated Counter Component
const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800;
    const startValue = displayValue;
    const endValue = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(currentValue);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, displayValue]);

  return <span>{formatCurrency(displayValue)}</span>;
};

// Main App Component
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);

  const [activeView, setActiveView] = useState('Home');
  const [reportView, setReportView] = useState('Monthly');
  const [duesFilter, setDuesFilter] = useState('Monthly');

  // Firebase Initialization
  useEffect(() => {
    if (!db) {
      try {
        console.log('🔥 Initializing Firebase...');
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          throw new Error('Firebase configuration is missing. Please check your .env file.');
        }

        const firebaseApp = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(firebaseApp);
        const firebaseAuth = getAuth(firebaseApp);

        setDb(firestoreDb);

        onAuthStateChanged(firebaseAuth, async (user) => {
          if (!user) {
            console.log('👤 Signing in anonymously...');
            try {
              await signInAnonymously(firebaseAuth);
            } catch (authError) {
              console.error('Auth error:', authError);
              setError('Authentication failed.');
              setIsLoading(false);
              return;
            }
          }
          const currentUserId = firebaseAuth.currentUser?.uid || 'anonymous';
          console.log('✅ User ID:', currentUserId);
          setUserId(currentUserId);
          setIsAuthReady(true);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('❌ Firebase init failed:', error);
        setError(error.message);
        setIsLoading(false);
      }
    }
  }, [db]);

  // Data Fetching
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    console.log('📡 Setting up data listeners...');

    const incomeQ = query(collection(db, getIncomeCollectionPath(userId)), orderBy('date', 'desc'));
    const unsubIncomes = onSnapshot(incomeQ,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        }));
        console.log('💰 Incomes loaded:', data.length);
        setIncomes(data);
      },
      (error) => console.error('Error loading incomes:', error)
    );

    const expenseQ = query(collection(db, getExpenseCollectionPath(userId)), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(expenseQ,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        }));
        console.log('💸 Expenses loaded:', data.length);
        setExpenses(data);
      },
      (error) => console.error('Error loading expenses:', error)
    );

    const recurringQ = query(collection(db, getRecurringTemplateCollectionPath(userId)), orderBy('name', 'asc'));
    const unsubRecurring = onSnapshot(recurringQ,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        }));
        console.log('📅 Recurring bills loaded:', data.length);
        setRecurringTemplates(data);
      },
      (error) => console.error('Error loading recurring:', error)
    );

    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubRecurring();
    };
  }, [isAuthReady, db, userId]);

  // Handlers
  const handleAddIncome = async (data) => {
    if (!db || !userId) return;
    try {
      await addDoc(collection(db, getIncomeCollectionPath(userId)), {
        ...data,
        amount: parseFloat(data.amount),
        date: Timestamp.fromDate(new Date(data.date)),
      });
      console.log('✅ Income added');
      setActiveView('Home');
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Failed to add income. Please try again.');
    }
  };

  const handleAddExpense = async (data) => {
    if (!db || !userId) return;
    try {
      await addDoc(collection(db, getExpenseCollectionPath(userId)), {
        ...data,
        amount: parseFloat(data.amount),
        date: Timestamp.fromDate(new Date(data.date)),
      });
      console.log('✅ Expense added');
      if (!data.isGenerated) setActiveView('Home');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    }
  };

  const handleAddRecurringTemplate = async (data) => {
    if (!db || !userId) return;
    try {
      const day = data.date.split('-').map(Number)[2];
      await addDoc(collection(db, getRecurringTemplateCollectionPath(userId)), {
        name: data.name,
        amount: parseFloat(data.amount),
        category: data.category,
        frequency: data.frequency,
        dueDay: day,
        createdAt: Timestamp.fromDate(new Date()),
      });
      console.log('✅ Recurring bill added');
      setActiveView('Recurring');
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Failed to add recurring bill. Please try again.');
    }
  };

  const handleMarkPaid = async (template) => {
    const today = new Date();
    const paidForMonthYear = formatMonthYear(today);
    const alreadyPaid = expenses.some(exp =>
      exp.recurringTemplateId === template.id &&
      formatMonthYear(exp.date) === paidForMonthYear
    );

    if (alreadyPaid) {
      alert('This bill has already been marked as paid for this month!');
      return;
    }

    await handleAddExpense({
      name: template.name,
      amount: template.amount,
      date: today.toISOString().substring(0, 10),
      category: template.category,
      isRecurring: true,
      isGenerated: true,
      recurringTemplateId: template.id,
      paidFor: paidForMonthYear,
    });
  };

  const handleDelete = async (type, id) => {
    if (!db || !userId || !id) return;
    if (!window.confirm('Are you sure you want to delete this?')) return;

    try {
      const path = type === 'income'
        ? getIncomeCollectionPath(userId)
        : type === 'expense'
          ? getExpenseCollectionPath(userId)
          : getRecurringTemplateCollectionPath(userId);

      await deleteDoc(doc(db, path, id));
      console.log('✅ Deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  // Calculations
  const avgMonthlyIncome = useMemo(() => {
    if (incomes.length === 0) return 0;
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    return totalIncome / Math.max(1, incomes.length);
  }, [incomes]);

  const avgMonthlyExpense = useMemo(() => {
    if (expenses.length === 0) return 0;
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    return totalExpense / Math.max(1, expenses.length);
  }, [expenses]);

  // Filter recurring templates based on duesFilter
  const filteredDues = useMemo(() => {
    return recurringTemplates.filter(template => {
      const frequency = template.frequency || 'Monthly';
      return frequency === duesFilter;
    });
  }, [recurringTemplates, duesFilter]);

  const totalMonthlyDues = useMemo(() => {
    return filteredDues.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredDues]);

  const getPaidAmount = useMemo(() => {
    const currentMonthYear = formatMonthYear(new Date());
    const paidExpenses = expenses.filter(exp =>
      exp.recurringTemplateId && formatMonthYear(exp.date) === currentMonthYear
    );
    return paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const remainingToPay = totalMonthlyDues - getPaidAmount;
  const paymentProgress = totalMonthlyDues > 0 ? (getPaidAmount / totalMonthlyDues) * 100 : 0;

  // Get filtered transactions for Reports
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start, end;

    if (reportView === 'Monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (reportView === 'Weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
    }

    const filteredIncomes = incomes.filter(inc => inc.date >= start && inc.date <= end);
    const filteredExpenses = expenses.filter(exp => exp.date >= start && exp.date <= end);
    const totalIncome = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      incomes: filteredIncomes,
      expenses: filteredExpenses,
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
    };
  }, [incomes, expenses, reportView]);

  // Loading State
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.bg,
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          border: `4px solid ${THEME.cardDark}`,
          borderTopColor: THEME.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: THEME.text }}>Loading your finances...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: THEME.bg,
      }}>
        <XCircle size={64} color={THEME.danger} style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: THEME.text }}>Oops! Something went wrong</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: THEME.textMuted }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            fontWeight: 'bold',
            backgroundColor: THEME.primary,
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  // Render different views
  const renderView = () => {
    if (activeView === 'Home') {
      return <Dashboard />;
    } else if (activeView === 'Reports') {
      return <Reports />;
    } else if (activeView === 'AddIncome') {
      return <AddIncome />;
    } else if (activeView === 'Recurring') {
      return <RecurringBills />;
    } else if (activeView === 'AddExpense') {
      return <AddExpense />;
    }
  };

  // Dashboard Component
  const Dashboard = () => (
    <div style={{ padding: '1rem', paddingBottom: '6rem', backgroundColor: THEME.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: THEME.text, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Dashboard</h1>
      <p style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: '1rem', fontWeight: '400' }}>Welcome back!</p>

      {/* Income & Expense Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{
          backgroundColor: '#27272a',
          borderRadius: '0.875rem',
          padding: '0.875rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <Wallet size={18} color="#60a5fa" strokeWidth={2} />
          </div>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem', fontWeight: '500' }}>Avg. Income</p>
          <p style={{ fontSize: '1.25rem', fontWeight: '800', color: THEME.text, letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={avgMonthlyIncome} />
          </p>
        </div>

        <div style={{
          backgroundColor: '#27272a',
          borderRadius: '0.875rem',
          padding: '0.875rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <CreditCard size={18} color="#8b5cf6" strokeWidth={2} />
          </div>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem', fontWeight: '500' }}>Avg. Expenses</p>
          <p style={{ fontSize: '1.25rem', fontWeight: '800', color: THEME.text, letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={avgMonthlyExpense} />
          </p>
        </div>
      </div>

      {/* Upcoming Dues Section */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: THEME.text, letterSpacing: '-0.01em', flexShrink: 0 }}>Upcoming Dues</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            flexShrink: 0,
            backgroundColor: '#27272a',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            position: 'relative',
            minWidth: '220px',
            gap: '0.25rem'
          }}>
            {['Monthly', 'Weekly', 'Daily'].map(filter => (
              <button
                key={filter}
                className="filter-button-small"
                onClick={() => {
                  console.log('Filter clicked:', filter);
                  setDuesFilter(filter);
                }}
                style={{
                  position: 'relative',
                  zIndex: 10,
                  padding: '0.50rem 0',
                  fontSize: '9px',
                  fontWeight: '600',
                  borderRadius: '0.375rem',
                  backgroundColor: 'transparent',
                  color: duesFilter === filter ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  ...MOBILE_TOUCH,
                  minHeight: 'auto',
                  minWidth: 'auto'
                }}
              >
                {duesFilter === filter && (
                  <motion.div
                    layoutId="activeFilter"
                    className="active-filter-bg"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#8b5cf6',
                      zIndex: -1
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                )}
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Total Dues Card */}
        <div style={{
          backgroundColor: '#27272a',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          textAlign: 'center',
          marginBottom: '0.5rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <p style={{ fontSize: '0.6rem', color: '#9ca3af', marginBottom: '0.25rem', fontWeight: '500' }}>Total {duesFilter} Dues</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#67e8f9', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            <AnimatedCounter value={totalMonthlyDues} />
          </p>

          <div style={{
            backgroundColor: '#1f1f1f',
            borderRadius: '0.5rem',
            padding: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', gap: '0.5rem' }}>
              <div style={{ flex: '1', minWidth: '0' }}>
                <p style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', letterSpacing: '0.05em' }}>REMAINING</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ef4444', marginTop: '0.125rem' }}>
                  <AnimatedCounter value={remainingToPay} />
                </p>
              </div>
              <div style={{ textAlign: 'right', flex: '1', minWidth: '0' }}>
                <p style={{ fontSize: '0.55rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAID</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '800', color: '#22c55e', marginTop: '0.125rem' }}>
                  <AnimatedCounter value={getPaidAmount} />
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              height: '6px',
              backgroundColor: '#27272a',
              borderRadius: '9999px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${paymentProgress}%`,
                background: '#22c55e',
                borderRadius: '9999px',
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)'
              }}></div>
            </div>
          </div>
        </div>

        {/* Due Details */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: THEME.text, letterSpacing: '-0.02em' }}>Due Details</h3>
            <span style={{
              fontSize: '0.65rem',
              color: '#9ca3af',
              fontWeight: '500'
            }}>
              {filteredDues.length} Items
            </span>
          </div>

          {filteredDues.length > 0 ? (
            filteredDues.slice(0, 3).map(bill => {
              const currentMonthYear = formatMonthYear(new Date());
              const isPaid = expenses.some(exp =>
                exp.recurringTemplateId === bill.id &&
                formatMonthYear(exp.date) === currentMonthYear
              );
              const dueDay = bill.dueDay || (bill.createdAt ? bill.createdAt.getDate() : 1);

              return (
                <div key={bill.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: '#27272a',
                  borderRadius: '0.5rem',
                  marginBottom: '0.375rem',
                  borderLeft: `3px solid ${isPaid ? '#22c55e' : '#6366f1'}`,
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeftWidth: '3px',
                  borderLeftColor: isPaid ? '#22c55e' : '#6366f1',
                  gap: '0.5rem'
                }}>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <p style={{ fontWeight: '700', color: THEME.text, marginBottom: '0.0625rem', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.name}</p>
                    <p style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: '500' }}>Due on the {dueDay}th</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: '800', color: THEME.text, fontSize: '0.8rem', marginBottom: '0.0625rem', whiteSpace: 'nowrap' }}>{formatCurrency(bill.amount)}</p>
                    {isPaid ? (
                      <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '600' }}>Paid</span>
                    ) : (
                      <button
                        onClick={() => handleMarkPaid(bill)}
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: '600',
                          backgroundColor: 'transparent',
                          color: '#9ca3af',
                          border: 'none',
                          padding: '0.125rem',
                          cursor: 'pointer',
                          ...MOBILE_TOUCH
                        }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ textAlign: 'center', color: THEME.textMuted, padding: '1rem' }}>No bills set up yet</p>
          )}
        </div>
      </div>
    </div>
  );

  // Reports Component
  const Reports = () => (
    <div style={{ padding: '1rem', paddingBottom: '6rem', backgroundColor: THEME.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: THEME.text, marginBottom: '0.25rem' }}>Reports</h1>
          <p style={{ fontSize: '0.8rem', color: THEME.textMuted }}>Welcome back!</p>
        </div>
        <button
          onClick={() => setActiveView('Home')}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            backgroundColor: THEME.card,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Home size={20} color={THEME.text} />
        </button>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: THEME.card, padding: '0.25rem', borderRadius: '0.75rem' }}>
        {['Monthly', 'Weekly', 'Daily'].map(view => (
          <button
            key={view}
            onClick={() => setReportView(view)}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: reportView === view ? THEME.primary : 'transparent',
              color: THEME.text,
              border: 'none',
              cursor: 'pointer',
              ...MOBILE_TOUCH
            }}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: THEME.card,
        borderRadius: '0.75rem'
      }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" fill="none" stroke={THEME.text} strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: THEME.text }}>
          November 2025
        </span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" fill="none" stroke={THEME.text} strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Total Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
          borderRadius: '0.75rem',
          padding: '1.25rem'
        }}>
          <p style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '0.5rem' }}>Total Income</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            <AnimatedCounter value={filteredTransactions.totalIncome} />
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          borderRadius: '0.75rem',
          padding: '1.25rem'
        }}>
          <p style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 'bold', marginBottom: '0.5rem' }}>Total Expenses</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            <AnimatedCounter value={filteredTransactions.totalExpense} />
          </p>
        </div>
      </div>

      {/* Net Cash Flow */}
      <div style={{
        backgroundColor: THEME.card,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        textAlign: 'center',
        marginBottom: '1.5rem'
      }}>
        <p style={{ fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>Net Cash Flow</p>
        <p style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: filteredTransactions.netCashflow >= 0 ? THEME.green : THEME.danger
        }}>
          {filteredTransactions.netCashflow > 0 ? '+' : ''}
          <AnimatedCounter value={filteredTransactions.netCashflow} />
        </p>
      </div>

      {/* History */}
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: THEME.text, marginBottom: '1rem' }}>History</h3>
      {[...filteredTransactions.incomes, ...filteredTransactions.expenses]
        .sort((a, b) => b.date - a.date)
        .map(t => {
          const isIncome = !!t.clientName;
          return (
            <div key={t.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: THEME.card,
              borderRadius: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isIncome ? <TrendingUp size={20} color={THEME.green} /> : <TrendingDown size={20} color={THEME.danger} />}
                </div>
                <div>
                  <p style={{ fontWeight: '600', color: THEME.text, marginBottom: '0.25rem' }}>
                    {isIncome ? t.clientName : t.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: THEME.textMuted }}>
                    {formatDate(t.date)} • {isIncome ? t.type : t.category}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                  color: isIncome ? THEME.green : THEME.text
                }}>
                  {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
                <button
                  onClick={() => handleDelete(isIncome ? 'income' : 'expense', t.id)}
                  style={{
                    fontSize: '0.75rem',
                    color: THEME.textMuted,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '0.25rem',
                    padding: '0.5rem',
                    ...MOBILE_TOUCH
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );

  // Add Income Component
  const AddIncome = () => {
    const [formData, setFormData] = useState({
      clientName: '',
      amount: '',
      date: new Date().toISOString().substring(0, 10),
      type: INCOME_TYPES[0].value
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.clientName || !formData.amount) {
        alert('Please fill in all required fields');
        return;
      }
      handleAddIncome(formData);
    };

    return (
      <div style={{ padding: '1rem', paddingBottom: '6rem', backgroundColor: THEME.bg, minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: THEME.text, marginBottom: '0.25rem' }}>Add Income</h1>
            <p style={{ fontSize: '0.8rem', color: THEME.textMuted }}>Track your earnings</p>
          </div>
          <button
            onClick={() => setActiveView('Home')}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              backgroundColor: THEME.card,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Home size={20} color={THEME.text} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
              Client / Source
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="e.g. Google Project"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: THEME.card,
                border: 'none',
                color: THEME.text,
                ...MOBILE_INPUT
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: THEME.card,
                border: 'none',
                color: THEME.text,
                cursor: 'pointer',
                ...MOBILE_INPUT
              }}
            >
              {INCOME_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
                Amount
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: THEME.card,
                  border: 'none',
                  color: THEME.text,
                  ...MOBILE_INPUT
                }}
                step="0.01"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: THEME.card,
                  border: 'none',
                  color: THEME.text,
                  ...MOBILE_INPUT
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '0.75rem',
              background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.purple} 100%)`,
              border: 'none',
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${THEME.primary}50`,
              ...MOBILE_TOUCH
            }}
          >
            Save Income
          </button>
        </form>
      </div>
    );
  };

  // Recurring Bills Component
  const RecurringBills = () => {
    const currentMonthYear = formatMonthYear(new Date());

    return (
      <div style={{ padding: '1rem', paddingBottom: '6rem', backgroundColor: THEME.bg, minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: THEME.text, marginBottom: '0.25rem' }}>Recurring Bills</h1>
            <p style={{ fontSize: '0.8rem', color: THEME.textMuted }}>Manage your bills</p>
          </div>
          <button
            onClick={() => setActiveView('Home')}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              backgroundColor: THEME.card,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Home size={20} color={THEME.text} />
          </button>
        </div>

        {/* Monthly Bills Header */}
        <div style={{
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.purple} 100%)`,
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>Monthly Bills</h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{currentMonthYear}</p>
          </div>
          <Calendar size={32} color="white" />
        </div>

        {/* Add New Button */}
        <button
          onClick={() => setActiveView('AddExpense')}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '0.75rem',
            backgroundColor: 'transparent',
            border: '2px dashed #4b5563',
            color: THEME.textMuted,
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          + Add New Recurring Bill
        </button>

        {/* Bills List */}
        {recurringTemplates.length > 0 ? (
          recurringTemplates.map(bill => {
            const isPaid = expenses.some(exp =>
              exp.recurringTemplateId === bill.id &&
              formatMonthYear(exp.date) === currentMonthYear
            );
            const dueDay = bill.dueDay || (bill.createdAt ? bill.createdAt.getDate() : 1);

            return (
              <div key={bill.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: THEME.card,
                borderRadius: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(75, 85, 99, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isPaid ? <CheckCircle size={20} color={THEME.green} /> : <DollarSign size={20} color={THEME.textMuted} />}
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: THEME.text, marginBottom: '0.25rem' }}>{bill.name}</p>
                    <p style={{ fontSize: '0.75rem', color: THEME.textMuted }}>
                      Due: {dueDay}th • {formatCurrency(bill.amount)}
                    </p>
                  </div>
                </div>

                {!isPaid ? (
                  <button
                    onClick={() => handleMarkPaid(bill)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      ...MOBILE_TOUCH
                    }}
                  >
                    Pay
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete('template', bill.id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      ...MOBILE_TOUCH
                    }}
                  >
                    <XCircle size={18} color={THEME.textMuted} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p style={{ textAlign: 'center', color: THEME.textMuted, padding: '3rem' }}>No bills set up.</p>
        )}
      </div>
    );
  };

  // Add Expense Component
  const AddExpense = () => {
    const [formData, setFormData] = useState({
      name: '',
      amount: '',
      date: new Date().toISOString().substring(0, 10),
      category: EXPENSE_CATEGORIES[0],
      isRecurring: false,
      frequency: 'Monthly'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name || !formData.amount) {
        alert('Please fill in all required fields');
        return;
      }
      if (formData.isRecurring) {
        handleAddRecurringTemplate(formData);
      } else {
        handleAddExpense(formData);
      }
    };

    return (
      <div style={{ padding: '1rem', paddingBottom: '6rem', backgroundColor: THEME.bg, minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: THEME.text, marginBottom: '0.25rem' }}>Add Expense</h1>
            <p style={{ fontSize: '0.8rem', color: THEME.textMuted }}>Track your spending</p>
          </div>
          <button
            onClick={() => setActiveView('Home')}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              backgroundColor: THEME.card,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Home size={20} color={THEME.text} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
              Expense Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Adobe Subscription"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: THEME.card,
                border: 'none',
                color: THEME.text,
                ...MOBILE_INPUT
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: THEME.card,
                border: 'none',
                color: THEME.text,
                cursor: 'pointer',
                ...MOBILE_INPUT
              }}
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
                Amount
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: THEME.card,
                  border: 'none',
                  color: THEME.text,
                  ...MOBILE_INPUT
                }}
                step="0.01"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: THEME.card,
                  border: 'none',
                  color: THEME.text,
                  ...MOBILE_INPUT
                }}
                required
              />
            </div>
          </div>

          {/* Save as Recurring Bill Checkbox */}
          <div
            onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              backgroundColor: THEME.card,
              borderRadius: '0.75rem',
              marginBottom: formData.isRecurring ? '1rem' : '2rem',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '1.25rem',
              height: '1.25rem',
              borderRadius: '0.25rem',
              border: `2px solid ${formData.isRecurring ? THEME.primary : '#4b5563'}`,
              backgroundColor: formData.isRecurring ? THEME.primary : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {formData.isRecurring && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: THEME.text }}>
              Save as Recurring Bill
            </span>
          </div>

          {/* Frequency Selector (shown only when isRecurring is true) */}
          {formData.isRecurring && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: THEME.textMuted, marginBottom: '0.5rem' }}>
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: THEME.card,
                  border: 'none',
                  color: THEME.text,
                  cursor: 'pointer',
                  ...MOBILE_INPUT
                }}
              >
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '0.75rem',
              background: formData.isRecurring
                ? `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.purple} 100%)`
                : `linear-gradient(135deg, ${THEME.danger} 0%, #dc2626 100%)`,
              border: 'none',
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: formData.isRecurring ? `0 4px 12px ${THEME.primary}50` : `0 4px 12px ${THEME.danger}50`,
              ...MOBILE_TOUCH
            }}
          >
            {formData.isRecurring ? 'Save Bill Template' : 'Save Expense'}
          </button>
        </form>
      </div>
    );
  };

  // Bottom Navigation
  const BottomNav = () => (
    <div style={{
      position: 'fixed',
      bottom: '0.75rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
      width: 'calc(100% - 1.5rem)',
      maxWidth: '24rem'
    }}>
      <div style={{
        backgroundColor: 'rgba(31, 31, 31, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0.5rem 0.75rem',
        gap: '0.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          onClick={() => setActiveView('Home')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: activeView === 'Home' ? '#ffffff' : '#6b7280',
            cursor: 'pointer',
            padding: '0.5rem 0.375rem',
            gap: '0.2rem',
            ...MOBILE_TOUCH,
            flex: 1,
            transition: 'color 0.2s ease'
          }}
        >
          <Home size={18} strokeWidth={2} />
          <span style={{ fontSize: '0.55rem', fontWeight: '500' }}>Home</span>
        </button>

        <button
          onClick={() => setActiveView('Reports')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: activeView === 'Reports' ? '#ffffff' : '#6b7280',
            cursor: 'pointer',
            padding: '0.5rem 0.375rem',
            gap: '0.2rem',
            ...MOBILE_TOUCH,
            flex: 1,
            transition: 'color 0.2s ease'
          }}
        >
          <TrendingUp size={18} strokeWidth={2} />
          <span style={{ fontSize: '0.55rem', fontWeight: '500' }}>Reports</span>
        </button>

        <button
          onClick={() => setActiveView(activeView === 'AddIncome' ? 'AddExpense' : 'AddIncome')}
          style={{
            width: '2.75rem',
            height: '2.75rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c7cf5 0%, #9f7cf5 100%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            boxShadow: '0 4px 16px rgba(124, 124, 245, 0.5)',
            ...MOBILE_TOUCH,
            flexShrink: 0,
            transition: 'transform 0.2s ease'
          }}
        >
          <Plus size={20} color="white" strokeWidth={2.5} />
        </button>

        <button
          onClick={() => setActiveView('Recurring')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: activeView === 'Recurring' ? '#ffffff' : '#6b7280',
            cursor: 'pointer',
            padding: '0.5rem 0.375rem',
            gap: '0.2rem',
            ...MOBILE_TOUCH,
            flex: 1,
            transition: 'color 0.2s ease'
          }}
        >
          <Calendar size={18} strokeWidth={2} />
          <span style={{ fontSize: '0.55rem', fontWeight: '500' }}>Bills</span>
        </button>

        <button
          onClick={() => setActiveView('AddExpense')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: activeView === 'AddExpense' ? '#ffffff' : '#6b7280',
            cursor: 'pointer',
            padding: '0.5rem 0.375rem',
            gap: '0.2rem',
            ...MOBILE_TOUCH,
            flex: 1,
            transition: 'color 0.2s ease'
          }}
        >
          <TrendingDown size={18} strokeWidth={2} />
          <span style={{ fontSize: '0.55rem', fontWeight: '500' }}>Expense</span>
        </button>
      </div>
    </div>
  );

  // Main Render
  return (
    <div style={{
      width: '100%',
      maxWidth: '28rem',
      margin: '0 auto',
      backgroundColor: THEME.bg,
      minHeight: '100dvh', // Dynamic viewport height for mobile
      position: 'relative',
      paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area
      WebkitUserSelect: 'none', // Prevent text selection on mobile
      userSelect: 'none',
      overflowX: 'hidden'
    }}>
      {renderView()}
      <BottomNav />
    </div>
  );
};

export default App;
