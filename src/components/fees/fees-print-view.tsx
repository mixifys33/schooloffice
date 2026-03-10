'use client'

import React from 'react'

interface FeeListItem {
  id: string
  admissionNumber: string
  name: string
  className: string
  streamName: string | null
  amountRequired: number
  amountPaid: number
  balance: number
  paymentStatus: string
  lastPaymentDate: string | null
  lastPaymentMethod: string | null
}

interface FeesPrintViewProps {
  students: FeeListItem[]
  summary: {
    totalStudents: number
    paidStudents: number
    unpaidStudents: number
    partialStudents: number
    totalExpected: number
    totalCollected: number
    totalOutstanding