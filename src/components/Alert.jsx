/**
 * Alert notification component
 */

import './Alert.css'

export const Alert = ({ message, type }) => {
  if (!message) return null

  return (
    <div className={`alert alert-${type}`}>
      {message}
    </div>
  )
}
