import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {

  const uploadPosts = async (file: React.ChangeEvent<HTMLInputElement>) => {
    if (file.target.files) {
      const formData = new FormData()
      formData.append('file', file.target.files[0])
      try {
        const response = await axios.post('http://localhost:5000/upload_posts', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        console.log('File uploaded successfully:', response.data)
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
  }

  return (
    <div>
      <input type="file" onChange={uploadPosts} />
    </div>
  )
}

export default App
