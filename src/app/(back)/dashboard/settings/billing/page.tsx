'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, CheckCircle, AlertTriangle, Phone, Mail } from 'lucide-react'

interface SubscriptionData {
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL'
  plan: string
  expiresAt: string | null
  featuresRestricted: boolean
  smsEnabled: boolean
  reportsEnabled: boolean
  amountDue: number
  currency: string
}

export default function BillingPage() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const schoolId = session?.user?.schoolId

  useEffect(() => {
    if (schoolId) {
      fetchSubscription()
    }
  }, [schoolId])

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/subscription`)
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      } else {
        // If no subscription endpoint, use mock data
        setSubscription({
          status: 'SUSPENDED',
          plan: 'Standard',
          expiresAt: null,
          featuresRestricted: true,
          smsEnabled: false,
          reportsEnabled: false,
          amountDue: 150000,
          currency: 'UGX',
        })
      }
    } catch (err) {
      // Use mock data on error
      setSubscription({
        status: 'SUSPENDED',
        plan: 'Standard',
        expiresAt: null,
        featuresRestricted: true,
        smsEnabled: false,
        reportsEnabled: false,
        amountDue: 150000,
        currency: 'UGX',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async (method: 'mobile_money' | 'card' | 'bank') => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          amount: subscription?.amountDue,
          method,
          type: 'subscription',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
        } else {
          setPaymentSuccess(true)
          fetchSubscription()
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Payment initiation failed. Please try again.')
      }
    } catch (err) {
      setError('Payment service unavailable. Please contact support.')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

      {paymentSuccess && (
        <div className="mb-6 p-4 bg-[var(--success-light)] border border-[var(--success-light)] rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
          <p className="text-[var(--success-dark)]">Payment initiated successfully! Your features will be restored shortly.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[var(--chart-red)]" />
          <p className="text-[var(--danger-dark)]">{error}</p>
        </div>
      )}

      {/* Subscription Status */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Subscription Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Current Plan</p>
            <p className="text-lg font-medium">{subscription?.plan || 'Standard'}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
              subscription?.status === 'ACTIVE' 
                ? 'bg-[var(--success-light)] text-[var(--success-dark)]'
                : subscription?.status === 'TRIAL'
                ? 'bg-[var(--info-light)] text-[var(--info-dark)]'
                : 'bg-[var(--danger-light)] text-[var(--danger-dark)]'
            }`}>
              {subscription?.status || 'Unknown'}
            </span>
          </div>
          {subscription?.expiresAt && (
            <div>
              <p className="text-sm text-[var(--text-muted)]">Expires</p>
              <p className="text-lg font-medium">
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {subscription?.amountDue && subscription.amountDue > 0 && (
            <div>
              <p className="text-sm text-[var(--text-muted)]">Amount Due</p>
              <p className="text-lg font-bold text-[var(--chart-red)]">
                {formatCurrency(subscription.amountDue, subscription.currency)}
              </p>
            </div>
          )}
        </div>

        {subscription?.featuresRestricted && (
          <div className="mt-4 p-3 bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg">
            <p className="text-sm text-[var(--danger-dark)] font-medium">Restricted Features:</p>
            <ul className="mt-1 text-sm text-[var(--chart-red)] list-disc list-inside">
              {!subscription.smsEnabled && <li>SMS messaging disabled</li>}
              {!subscription.reportsEnabled && <li>Report generation disabled</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Payment Section */}
      {subscription?.featuresRestricted && subscription?.amountDue && subscription.amountDue > 0 && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Make Payment</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Pay <span className="font-bold">{formatCurrency(subscription.amountDue, subscription.currency)}</span> to restore all features.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mobile Money */}
            <button
              onClick={() => handlePayment('mobile_money')}
              disabled={isProcessing}
              className="p-4 border-2 border-[var(--border-default)] rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--info-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="h-8 w-8 mx-auto mb-2 text-[var(--chart-green)]" />
              <p className="font-medium">Mobile Money</p>
              <p className="text-sm text-[var(--text-muted)]">MTN, Airtel</p>
            </button>

            {/* Card Payment */}
            <button
              onClick={() => handlePayment('card')}
              disabled={isProcessing}
              className="p-4 border-2 border-[var(--border-default)] rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--info-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-[var(--chart-blue)]" />
              <p className="font-medium">Card Payment</p>
              <p className="text-sm text-[var(--text-muted)]">Visa, Mastercard</p>
            </button>

            {/* Bank Transfer */}
            <button
              onClick={() => handlePayment('bank')}
              disabled={isProcessing}
              className="p-4 border-2 border-[var(--border-default)] rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--info-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-8 w-8 mx-auto mb-2 text-[var(--chart-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="font-medium">Bank Transfer</p>
              <p className="text-sm text-[var(--text-muted)]">Direct deposit</p>
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[var(--chart-blue)]">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--chart-blue)]"></div>
              <span>Processing payment...</span>
            </div>
          )}
        </div>
      )}

      {/* Contact Support */}
      <div className="bg-[var(--bg-surface)] rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Contact our support team for billing inquiries or payment assistance.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:support@schooloffice.academy"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border rounded-lg hover:bg-[var(--bg-surface)]"
          >
            <Mail className="h-4 w-4" />
            support@schooloffice.academy
          </a>
          <a
            href="tel:+256700000000"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border rounded-lg hover:bg-[var(--bg-surface)]"
          >
            <Phone className="h-4 w-4" />
            +256 700 000 000
          </a>
        </div>
      </div>
    </div>
  )
}
