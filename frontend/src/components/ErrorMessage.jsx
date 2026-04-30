/* Author: Nandar Lin */

import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import StateMessage from './StateMessage.jsx'

export default function ErrorMessage({
  title = 'City not found',
  description = "We couldn't find weather data for that city. Check the spelling and try again.",
  onRetry,
  retryLabel = 'Retry',
}) {
  return (
    <StateMessage
      icon={WarningAmberRoundedIcon}
      title={title}
      description={description}
      actionLabel={retryLabel}
      onAction={onRetry}
    />
  )
}

