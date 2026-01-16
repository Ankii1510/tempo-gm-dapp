// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TempoGM
 * @dev A simple contract to track daily "Good Morning" vibes on the Tempo chain.
 */
contract TempoGM {
    uint256 public totalGMs;
    
    struct UserStats {
        uint256 totalGMs;
        uint256 lastGMTimestamp;
        uint256 streak;
    }
    
    struct GMMessage {
        address sender;
        string message;
        uint256 timestamp;
        uint256 globalCount;
    }
    
    mapping(address => UserStats) public userStats;
    GMMessage[] public messages;
    
    event NewGM(
        address indexed user, 
        uint256 indexed timestamp,
        uint256 globalCount, 
        string message, 
        uint256 streak
    );

    /**
     * @dev Send a GM and update stats.
     * @param message A custom message (e.g., "GM! Happy Friday!")
     */
    function sendGM(string calldata message) external {
        UserStats storage stats = userStats[msg.sender];
        
        // Handle streaks
        if (stats.lastGMTimestamp > 0) {
            uint256 timePassed = block.timestamp - stats.lastGMTimestamp;
            
            if (timePassed > 1 days && timePassed < 2 days) {
                // Continued streak
                stats.streak += 1;
            } else if (timePassed >= 2 days) {
                // Streak broken
                stats.streak = 1;
            }
            // If < 1 day, streak stays the same (multiple GMs per day don't increase streak)
        } else {
            // First time GMing
            stats.streak = 1;
        }
        
        stats.totalGMs += 1;
        stats.lastGMTimestamp = block.timestamp;
        
        totalGMs += 1;
        
        // Store message in history
        messages.push(GMMessage({
            sender: msg.sender,
            message: message,
            timestamp: block.timestamp,
            globalCount: totalGMs
        }));
        
        emit NewGM(msg.sender, block.timestamp, totalGMs, message, stats.streak);
    }
    
    /**
     * @dev Helper to get user stats in one call.
     */
    function getUserStats(address user) external view returns (uint256 count, uint256 streak, uint256 lastTime) {
        UserStats storage stats = userStats[user];
        return (stats.totalGMs, stats.streak, stats.lastGMTimestamp);
    }
    
    /**
     * @dev Get recent GM messages
     * @param count Number of recent messages to retrieve
     */
    function getRecentMessages(uint256 count) external view returns (
        address[] memory senders,
        string[] memory messageTexts,
        uint256[] memory timestamps,
        uint256[] memory counts
    ) {
        uint256 totalMessages = messages.length;
        uint256 returnCount = count > totalMessages ? totalMessages : count;
        
        senders = new address[](returnCount);
        messageTexts = new string[](returnCount);
        timestamps = new uint256[](returnCount);
        counts = new uint256[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            uint256 index = totalMessages - returnCount + i;
            GMMessage storage gm = messages[index];
            senders[i] = gm.sender;
            messageTexts[i] = gm.message;
            timestamps[i] = gm.timestamp;
            counts[i] = gm.globalCount;
        }
        
        return (senders, messageTexts, timestamps, counts);
    }
    
    /**
     * @dev Get total number of messages
     */
    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }
}
