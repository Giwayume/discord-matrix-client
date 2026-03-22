
export interface UserProfile {
    userId: string;
    avatarUrl?: string;
    currentlyActive: boolean;
    displayname?: string;
    lastActiveAgo?: number;
    presence: 'online' | 'offline' | 'unavailable';
    statusMessage?: string;
}
