'use client';

import Link from 'next/link';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import PostShareSheet from '@/components/PostShareSheet';
import { ShareIcon } from '@/components/ShareIcon';
import { ProtlysLoader } from '@/app/calculator/ProtlysLoader';
import {
  createFeedPostAction,
  updateFeedPostAction,
  deleteFeedPostAction,
  getFeedCommentsAction,
  toggleFeedLikeAction,
  toggleFeedCommentLikeAction,
  addFeedCommentAction,
} from './feed-actions';

const POST_TYPES = [
  { value: 'progress', label: 'Progress' },
  { value: 'run', label: 'Run / Walk' },
  { value: 'workout', label: 'Workout' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'general', label: 'Post' },
];

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  if (name === 'share') return <ShareIcon size={size} />;
  const paths = {
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="M3 16l5-5 4 4 3-3 6 6" /></>,
    chart: <><path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
        more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" ¶»§q«^