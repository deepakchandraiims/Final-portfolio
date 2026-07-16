'use client'

import { createContext, useContext } from 'react'
import { SEED_CONTENT } from '@/lib/portfolio-data'

export const SiteContext = createContext(SEED_CONTENT)

export const useSite = () => useContext(SiteContext) || SEED_CONTENT

/* ------------------------- Small building blocks ------------------------- */
