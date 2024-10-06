class ConversationLogService {
  constructor() {
    // Map<number, ConversationLog> - Stores conversation logs with id as key
    this.conversationLogRepository = new Map();

    // number - Counter for generating unique ids
    this.idCounter = 1;
  }

  /**
   * @param {number} [page] - Optional page number for pagination
   * @param {number} [pageSize] - Optional page size for pagination
   * @returns {Promise<[Array<ConversationLog>, number]>} - Paginated logs and total count
   */
  async getAllConversationLogs(page, pageSize) {
    const logsArray = Array.from(this.conversationLogRepository.values());

    if (page !== undefined && pageSize !== undefined) {
      const skip = (page - 1) * pageSize;
      const paginatedLogs = logsArray.slice(skip, skip + pageSize);
      return [paginatedLogs, logsArray.length];
    } else {
      console.log("conversationLogs", logsArray.length);
      return [logsArray, logsArray.length];
    }
  }

  /**
   * @param {number} id - ID of the conversation log to retrieve
   * @returns {Promise<ConversationLog | undefined>} - Returns the conversation log or undefined
   */
  async getConversationLogById(id) {
    return this.conversationLogRepository.get(id);
  }

  /**
   * @param {ConversationLog} conversationLogData - Data for the new conversation log
   * @returns {Promise<ConversationLog>} - The created conversation log with ID
   */
  async createConversationLog(conversationLogData) {
    const newConversationLog = { id: this.idCounter, ...conversationLogData };
    this.conversationLogRepository.set(this.idCounter, newConversationLog);
    this.idCounter++;
    return newConversationLog;
  }

  /**
   * @param {number} id - ID of the conversation log to update
   * @param {Partial<ConversationLog>} conversationLogData - Updated conversation log data
   * @returns {Promise<ConversationLog | undefined>} - Updated conversation log or undefined if not found
   */
  async updateConversationLog(id, conversationLogData) {
    const existingLog = this.conversationLogRepository.get(id);
    if (!existingLog) {
      return undefined;
    }
    const updatedLog = { ...existingLog, ...conversationLogData };
    this.conversationLogRepository.set(id, updatedLog);
    return updatedLog;
  }

  /**
   * @param {number} id - ID of the conversation log to delete
   * @returns {Promise<void>} - Deletes the conversation log or throws an error if not found
   */
  async deleteConversationLog(id) {
    if (!this.conversationLogRepository.has(id)) {
      throw new Error("ConversationLog not found");
    }
    this.conversationLogRepository.delete(id);
  }

  /**
   * @param {string} prompt - The prompt to search conversation logs by
   * @returns {Promise<ConversationLog | undefined>} - Returns the conversation log that matches the prompt or undefined
   */
  async findByPrompt(prompt) {
    for (const log of this.conversationLogRepository.values()) {
      if (log.user === prompt) {
        return log;
      }
    }
    return undefined;
  }
}

// Example ConversationLog type for reference
// ConversationLog = {
//   id: number,
//   user: string,
//   message: string,
//   timestamp: string
// };

const conversationLogService = new ConversationLogService();
export { conversationLogService, ConversationLogService };
