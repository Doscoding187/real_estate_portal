import React, { useState } from 'react';

const MessagesCenter: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState(0);
  const [newMessage, setNewMessage] = useState('');

  // Sample conversations data
  const conversations = [
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: 'SJ',
      lastMessage: 'Thanks for the update on the Riverside project...',
      time: '2:45 PM',
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: 'Michael Chen',
      avatar: 'MC',
      lastMessage: 'Can we schedule a viewing for next week?',
      time: '11:30 AM',
      unread: 0,
      online: false,
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      avatar: 'ER',
      lastMessage: 'The floor plans look great!',
      time: 'Yesterday',
      unread: 0,
      online: true,
    },
    {
      id: 4,
      name: 'David Wilson',
      avatar: 'DW',
      lastMessage: 'When will the construction be completed?',
      time: 'Yesterday',
      unread: 1,
      online: false,
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      avatar: 'LT',
      lastMessage: 'Interested in the penthouse unit',
      time: 'Oct 12',
      unread: 0,
      online: false,
    },
  ];

  // Sample messages for the selected conversation
  const messages = [
    {
      id: 1,
      sender: 'Sarah Johnson',
      content:
        "Hi there! I'm interested in the Riverside Apartments project. Could you provide more details about the available units?",
      time: '10:30 AM',
      isOwn: false,
    },
    {
      id: 2,
      sender: 'You',
      content:
        "Hello Sarah! I'd be happy to help. We currently have 3-bedroom and 4-bedroom units available with stunning river views.",
      time: '10:32 AM',
      isOwn: true,
    },
    {
      id: 3,
      sender: 'Sarah Johnson',
      content:
        "That sounds perfect! What's the pricing for these units? Also, when is the expected completion date?",
      time: '10:35 AM',
      isOwn: false,
    },
    {
      id: 4,
      sender: 'You',
      content:
        'The 3-bedroom units start at R2.8M and the 4-bedroom units at R3.9M. Construction is expected to be completed by Q2 2026.',
      time: '10:38 AM',
      isOwn: true,
    },
    {
      id: 5,
      sender: 'Sarah Johnson',
      content:
        "Thanks for the update on the Riverside project. I'd like to schedule a viewing for next weekend if possible.",
      time: '2:45 PM',
      isOwn: false,
    },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // In a real app, this would send the message
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="typ-h2 mb-4">Messages</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="input w-full pl-10"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation === conversation.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between">
                    <h4 className="font-medium truncate">{conversation.name}</h4>
                    <span className="text-xs text-gray-500">{conversation.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                </div>
                {conversation.unread > 0 && (
                  <div className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Pane */}
      <div className="flex-1 flex flex-col">
        {/* Message Header */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {conversations.find(c => c.id === selectedConversation)?.avatar || 'SJ'}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="ml-3">
            <h3 className="font-medium">
              {conversations.find(c => c.id === selectedConversation)?.name || 'Sarah Johnson'}
            </h3>
            <p className="text-xs text-green-500">Online</p>
          </div>
          <div className="ml-auto flex space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Display */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-16 ${
                    message.isOwn
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${message.isOwn ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex items-center">
            <button type="button" className="p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 input mx-2"
            />
            <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessagesCenter;
