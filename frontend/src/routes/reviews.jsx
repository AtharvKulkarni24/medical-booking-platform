import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/reviews')({
  component: MyReviewPage,
})

function MyReviewPage(){
    return(
        <>
            <h1>Hello welcome to review page</h1>
        </>
    )
}