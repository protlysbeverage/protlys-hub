'use client';

export function Bubble({ className = '', children }) {
  return <div className={'protlys-bubble ' + className}>{children}</div>;
}
export function BubbleContent({ className = '', children }) {
  return <div className={'protlys-bubble-content ' + className}>{children}</div>;
}