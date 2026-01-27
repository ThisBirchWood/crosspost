import axios from 'axios'
import './App.css'
import { useState } from 'react'

function App() {
  let postFile: File | undefined
  let commentFile: File | undefined
  const [returnMessage, setReturnMessage] = useState('')

  const uploadFiles = async () => {
    if (!postFile || !commentFile) {
      alert('Please select both files before uploading.')
      return
    }

    const formData = new FormData()
    formData.append('posts', postFile)
    formData.append('comments', commentFile)

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      console.log('Files uploaded successfully:', response.data)
      setReturnMessage(`Upload successful! Posts: ${response.data.posts_count}, Comments: ${response.data.comments_count}`)
    } catch (error) {
      console.error('Error uploading files:', error)
      setReturnMessage('Error uploading files. Error details: ' + error)
    }
  }
  return (
    <div>
      <div className="post-file-upload">
        <h2>Posts File</h2>
        <input type="file" onChange={(e) => postFile = e.target.files?.[0]}></input>
      </div>
      <div className="comment-file-upload">
        <h2>Comments File</h2>
        <input type="file" onChange={(e) => commentFile = e.target.files?.[0]}></input>
      </div>
      <button onClick={uploadFiles}>Upload</button>

      <p>{returnMessage}</p>
    </div>
  )
}

export default App
