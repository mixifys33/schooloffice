/**
 * Exam-Only Performance Report Component
 * 
 * Displays exam-only reports showing exam scores with "CA pending" status notes
 * for exceptional cases with DoS override.
 * 
 * Requirements: 27.2, 27.6, 18.1, 18.2, 18.3
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@