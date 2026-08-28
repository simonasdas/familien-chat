export interface User {
  id: number;
  name: string;
  birthday: string;
  profileImage: string | null;
  status: string;
  vacation: string;
  customStatus: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  author: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  title: string | null;
  description: string | null;
  pollId: number | null;
  poll: Poll | null;
  reactions: ReactionRef[];
  createdAt: string;
}

export interface ReactionRef {
  voter: string;
  emoji: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
  picked: boolean;
}

export interface PollVoteRef {
  voter: string;
  optionId: number;
}

export interface Poll {
  id: number;
  author: string;
  question: string;
  anonymous: boolean;
  singleChoice: boolean;
  createdAt: string;
  totalVotes: number;
  options: PollOption[];
  voters: PollVoteRef[];
}
