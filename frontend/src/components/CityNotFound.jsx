/* Author: Nandar Lin */

import ErrorMessage from './ErrorMessage.jsx'

export default function CityNotFound({ description, onRetry }) {
  return <ErrorMessage description={description} onRetry={onRetry} />
}

