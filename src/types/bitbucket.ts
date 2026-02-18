export interface BitbucketUser {
  display_name: string;
  nickname: string;
  uuid: string;
  links: { html: { href: string } };
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  description: string;
  state: string;
  author: BitbucketUser;
  source: { branch: { name: string }; repository: { full_name: string } };
  destination: { branch: { name: string }; repository: { full_name: string } };
  reviewers: BitbucketUser[];
  created_on: string;
  updated_on: string;
  comment_count: number;
  task_count: number;
  links: { html: { href: string }; diff: { href: string } };
}

export interface BitbucketComment {
  id: number;
  content: { raw: string; markup: string; html: string };
  user: BitbucketUser;
  created_on: string;
  updated_on: string;
  inline?: {
    from: number | null;
    to: number | null;
    path: string;
  };
  parent?: { id: number };
  links: { html: { href: string } };
  resolved?: boolean;
}

export interface BitbucketTask {
  id: number;
  content: { raw: string; markup: string; html: string };
  creator: BitbucketUser;
  created_on: string;
  updated_on: string;
  state: 'UNRESOLVED' | 'RESOLVED';
  comment: { id: number };
}

export interface PaginatedResponse<T> {
  pagelen: number;
  size?: number;
  page?: number;
  next?: string;
  previous?: string;
  values: T[];
}
