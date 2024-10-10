interface ConversationLog {
  id: number;
  user: string;
  assistant: string;
  message: string;
  timestamp: string;
}

class ConversationLogService {
  private conversationLogRepository: Map<number, ConversationLog>;
  private idCounter: number;

  constructor() {
    // Stores conversation logs with id as key
    this.conversationLogRepository = new Map<number, ConversationLog>();

    // Counter for generating unique ids
    this.idCounter = 1;
  }

  async getAllConversationLogs(
    page?: number,
    pageSize?: number
  ): Promise<[ConversationLog[], number]> {
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

  async getConversationLogById(
    id: number
  ): Promise<ConversationLog | undefined> {
    return this.conversationLogRepository.get(id);
  }

  async createConversationLog(
    conversationLogData: Omit<ConversationLog, "id">
  ): Promise<ConversationLog> {
    const newConversationLog: ConversationLog = {
      id: this.idCounter,
      ...conversationLogData,
    };
    this.conversationLogRepository.set(this.idCounter, newConversationLog);
    this.idCounter++;
    return newConversationLog;
  }

  async updateConversationLog(
    id: number,
    conversationLogData: Partial<ConversationLog>
  ): Promise<ConversationLog | undefined> {
    const existingLog = this.conversationLogRepository.get(id);
    if (!existingLog) {
      return undefined;
    }
    const updatedLog: ConversationLog = {
      ...existingLog,
      ...conversationLogData,
    };
    this.conversationLogRepository.set(id, updatedLog);
    return updatedLog;
  }

  async deleteConversationLog(id: number): Promise<void> {
    if (!this.conversationLogRepository.has(id)) {
      throw new Error("ConversationLog not found");
    }
    this.conversationLogRepository.delete(id);
  }

  async findByPrompt(prompt: string): Promise<ConversationLog | undefined> {
    for (const log of this.conversationLogRepository.values()) {
      if (log.user === prompt) {
        return log;
      }
    }
    return undefined;
  }
}

const conversationLogService = new ConversationLogService();
export { conversationLogService, ConversationLogService };
