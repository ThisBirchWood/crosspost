import axios from 'axios'
import './../App.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

const UploadPage = () => {
  let postFile: File | undefined;
  let topicBucketFile: File | undefined;
  const [returnMessage, setReturnMessage] = useState('')
  const navigate = useNavigate()

  const uploadFiles = async () => {
    if (!postFile || !topicBucketFile) {
      alert('Please upload all files before uploading.')
      return
    }

    const formData = new FormData()
    formData.append('posts', postFile)
    formData.append('topics', topicBucketFile)

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
        <input style={{color: "black" }} type="file" onChange={(e) => postFile = e.target.files?.[0]}></input>
      </div>
      <div style={{ ...styles.card }}>
        <h2 style={{color: "black" }}>Topic Buckets File</h2>
        <input style={{color: "black" }} type="file" onChange={(e) => topicBucketFile = e.target.files?.[0]}></input>
      </div>
      <button onClick={uploadFiles}>Upload</button>

      <p>{returnMessage}</p>
    </div>
  )
}

export default UploadPage;
