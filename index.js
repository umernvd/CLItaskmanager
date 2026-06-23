const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Represents an individual task.
 */
class Task {
    constructor(id, description, createdAt = new Date().toLocaleString()) {
        this.id = id;
        this.description = description;
        this.createdAt = createdAt;
    }
}

/**
 * Manages all task operations and file storage.        
 */
class TaskManager {
    constructor(fileName = 'tasks.json') {
        // Store the full path to the JSON file
        this.filePath = path.join(process.cwd(), fileName);
        // The array that holds all tasks in memory
        this.tasks = [];
        // Load existing tasks from disk (if any) when starting
        this.loadTasks();
    }

    /**
     * Reads tasks from the JSON file safely.
     */
    loadTasks() {
        try {
            // If the file doesn't exist, start with an empty list
            if (!fs.existsSync(this.filePath)) {
                this.tasks = [];
                return;
            }

            const fileData = fs.readFileSync(this.filePath, 'utf8');
            // Parse the file, but handle a completely empty file gracefully
            this.tasks = fileData.trim() ? JSON.parse(fileData) : [];
        } catch (error) {
            // Show a red error message but keep the app running
            console.error(`\x1b[31m[Storage Error] Could not read storage file: ${error.message}\x1b[0m`);
            console.log('Starting with an empty task list for this session.\n');
            this.tasks = [];
        }
    }

    /**
     * Writes the current tasks array to the JSON file.
     */
    saveTasks() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.tasks, null, 2), 'utf8');
        } catch (error) {
            console.error(`\x1b[31m[Storage Error] Failed to write changes to disk: ${error.message}\x1b[0m`);
        }
    }

    /**
     * Finds a task by its ID and throws an error if it doesn't exist.
     * (Internal helper – prefixed with underscore to signal that it's not part of the public API.)
     */
    _findTaskOrThrow(idString) {
        const id = parseInt(idString, 10);
        if (isNaN(id)) {
            throw new Error('Task ID must be a valid number.');
        }

        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error(`Task with ID ${id} not found.`);
        }
        return task;
    }

    /**
     * Adds a new task with an auto-incremented ID.
     */
    addTask(description) {
        if (!description || description.trim() === '') {
            throw new Error('Task description cannot be empty.');
        }

        // Determine the next ID:
        // If tasks exist, find the largest current ID and add 1; otherwise start at 1.
        let nextId = 1;
        if (this.tasks.length > 0) {
            const maxId = this.tasks.reduce((max, t) => t.id > max ? t.id : max, 0);
            nextId = maxId + 1;
        }

        const newTask = new Task(nextId, description.trim());
        this.tasks.push(newTask);
        this.saveTasks();

        console.log(`\x1b[32m✔ Success: Task #${nextId} added successfully.\x1b[0m`);
    }

    /**
     * Updates the description of an existing task.
     */
    updateTask(idString, newDescription) {
        if (!newDescription || newDescription.trim() === '') {
            throw new Error('New task description cannot be empty.');
        }

        const task = this._findTaskOrThrow(idString);
        task.description = newDescription.trim();
        this.saveTasks();

        console.log(`\x1b[32m✔ Success: Task #${task.id} has been updated.\x1b[0m`);
    }

    /**
     * Deletes a task by its ID.
     */
    deleteTask(idString) {
        const taskToDelete = this._findTaskOrThrow(idString);
        // Keep all tasks except the one with the matching ID
        this.tasks = this.tasks.filter(t => t.id !== taskToDelete.id);
        this.saveTasks();

        console.log(`\x1b[32m✔ Success: Task #${taskToDelete.id} was deleted.\x1b[0m`);
    }

    /**
     * Prints all tasks to the console in a readable format.
     */
    listTasks() {
        if (this.tasks.length === 0) {
            console.log('\x1b[33mℹ Your task list is currently empty.\x1b[0m');
            return;
        }

        console.log('\n=== CURRENT TASKS ===');
        this.tasks.forEach(task => {
            console.log(`[ID: ${task.id}] ${task.description}`);
            console.log(`     Created: ${task.createdAt}`);
            console.log('---------------------');
        });
    }
    searchTasks(query) {
        const id = parseInt(query);
        if (!isNaN(id)) {
            const task = this.tasks.find(t => t.id === id);
            if (task) {
                console.log(`\x1b[32m✔ Found task:\x1b[0m`);
                console.log(`[ID: ${task.id}] ${task.description}`);
                console.log(`     Created: ${task.createdAt}`);
            } else {
                console.log(`\x1b[33mℹ No task found with ID ${id}.\x1b[0m`);
            }
            return;
        }
        const lowerQuery = query.toLowerCase();
        const matches = this.tasks.filter(t =>
            t.description.toLowerCase().includes(lowerQuery)
        );

        if (matches.length === 0) {
            console.log(`\x1b[33mℹ No tasks match "${query}".\x1b[0m`);
            return;
        }

        console.log(`\n=== SEARCH RESULTS FOR "${query}" ===`);
        matches.forEach(task => {
            console.log(`[ID: ${task.id}] ${task.description}`);
            console.log(`     Created: ${task.createdAt}`);
            console.log('---------------------');
        });
    }
}
function startCLI() {
    const manager = new TaskManager();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('==========================================');
    console.log('      WELCOME TO THE CLI TASK MANAGER     ');
    console.log('==========================================');
    console.log('Available commands:');
    console.log('  add <description>');
    console.log('  list');
    console.log('  update <id> <new description>');
    console.log('  search <id or keyword>');
    console.log('  delete <id>');
    console.log('  exit\n');

    const promptUser = () => {
        rl.question('task-manager> ', (input) => {
            const trimmedInput = input.trim();
            const parts = trimmedInput.split(' ');
            const command = parts[0].toLowerCase();
            const argumentsStr = parts.slice(1).join(' ');

            try {
                switch (command) {
                    case 'add':
                        manager.addTask(argumentsStr);
                        break;

                    case 'list':
                        manager.listTasks();
                        break;

                    case 'update': {
                        // For update, the argumentsStr should contain "<id> <description>"
                        // Split it into the ID and the new description
                        const argParts = argumentsStr.split(' ');
                        const id = argParts[0];
                        const desc = argParts.slice(1).join(' ');
                        if (!id || !desc) {
                            throw new Error('Malformed command. Syntax: update <id> <new description>');
                        }
                        manager.updateTask(id, desc);
                        break;
                    }
                    case 'search':
                        manager.searchTasks(argumentsStr);
                        break;

                    case 'delete':
                        manager.deleteTask(argumentsStr);
                        break;

                    case 'exit':
                        console.log('Goodbye!');
                        rl.close();
                        process.exit(0);
                        break;

                    case '':
                        // User pressed Enter without typing anything – ignore silently
                        break;

                    default:
                        console.log(`\x1b[31m❌ Unknown command: "${command}". Type add, list, update, delete, or exit.\x1b[0m`);
                }
            } catch (error) {
                console.error(`\x1b[31m❌ Error: ${error.message}\x1b[0m`);
            }
            console.log('');
            promptUser();
        });
    };

    promptUser();
}
startCLI();