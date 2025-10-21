/**
 * Alert notification component
 */

import { memo } from 'react';
import './Alert.css';

export const Alert = memo(({ message, type }) => {
  if (!message) return null;

  return <div className={`alert alert-${type}`}>{message}</div>;
});
