import axios from 'axios'
import './../App.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

const UploadPage = () => {
  let postFile: File | undefined
  let commentFile: File | undefined
  const [returnMessage, setReturnMessage] = useState('')
  const navigate = useNavigate()

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
      navigate('/stats')
    } catch (error) {
      console.error('Error uploading files:', error)
      setReturnMessage('Error uploading files. Error details: ' + error)
    }
  }
  return (
    <div style={{...styles.container, ...styles.grid, margin: "0"}}>
      <div style={{ ...styles.card }}>
        <h2 style={{color: "black" }}>Posts File</h2>
        <input type="file" onChange={(e) => postFile = e.target.files?.[0]}></input>
      </div>
      <div style={{ ...styles.card }}>
        <h2 style={{color: "black" }}>Comments File</h2>
        <input type="file" onChange={(e) => commentFile = e.target.files?.[0]}></input>
      </div>
      <button onClick={uploadFiles}>Upload</button>

      <p>{returnMessage}</p>
    </div>
  )
}

export default UploadPage;
