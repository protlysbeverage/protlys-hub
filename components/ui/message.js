'use client';

export function Message({ align = 'start', className = '', children }) {
  return <div className={'protlys-message protlys-message-' + align + ' ' + className}>{children}</div>;
}
export function MessageGroup({ className = '', children }) {
  return <div className={'protlys-message-group ' + className}>{children}</div>;
}
export function MessageAvatar({ className = '', children }) {
  return <div className={'protlys-message-avatar ' + className}>{children}</div>;
}
export function MessageContent({ className = '', children }) {
  return <div className={'protlys-message-content ' + className}>{children}</div>;
}
export function MessageHeader({ className = '', children }) {
  return <div className={'protlys-message-header ' + className}>{children}</div>;
}
export function MessageFooter({ className = '', children }) {
  return <div className={'protlys-message-footer ' + className}>{children}</div>;
}