import path from 'path'
import fs from 'fs'
import os from 'os'

export function getUploadDir(): string {
  // Attempt to use process.cwd() + '/public/uploads/imports' first
  const localDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }
    // Verify directory is actually writable
    const testFile = path.join(localDir, '.write-test-' + Date.now())
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
    return localDir
  } catch (err) {
    // If not writable (e.g. read-only serverless environment like Vercel or AWS Lambda),
    // fallback to os.tmpdir() which is always writable.
    const tempDir = path.join(os.tmpdir(), 'uploads', 'imports')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    return tempDir
  }
}
