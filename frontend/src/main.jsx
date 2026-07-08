import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import {AuthProvider} from "./context/AuthContext";
// Import the auto-generated route tree
import { routeTree } from './routeTree.gen'
import './index.css'

// Create a new router instance
const router = createRouter({ routeTree })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
  </StrictMode>  
)