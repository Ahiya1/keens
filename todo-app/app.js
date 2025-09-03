// Simple TODO App - keen Autonomous Development Platform
// Phase 3.1 Implementation

class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.render();
    }

    bindElements() {
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.emptyState = document.getElementById('emptyState');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.clearBtn = document.getElementById('clearCompleted');
        this.totalCount = document.getElementById('totalCount');
        this.completedCount = document.getElementById('completedCount');
        this.pendingCount = document.getElementById('pendingCount');
    }

    attachEventListeners() {
        // Add todo
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Input validation
        this.todoInput.addEventListener('input', () => {
            const isEmpty = this.todoInput.value.trim() === '';
            this.addBtn.disabled = isEmpty;
        });

        // Filter todos
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Clear completed
        this.clearBtn.addEventListener('click', () => this.clearCompleted());
    }

    addTodo() {
        const text = this.todoInput.value.trim();
        if (!text) return;

        const todo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.todoInput.value = '';
        this.addBtn.disabled = true;
        this.saveTodos();
        this.render();

        // Show success feedback
        this.showNotification('Todo added successfully!', 'success');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
        }
    }

    deleteTodo(id) {
        const todoIndex = this.todos.findIndex(t => t.id === id);
        if (todoIndex > -1) {
            this.todos.splice(todoIndex, 1);
            this.saveTodos();
            this.render();
            this.showNotification('Todo deleted!', 'warning');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.render();
    }

    clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('No completed todos to clear!', 'info');
            return;
        }

        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        this.render();
        this.showNotification(`Cleared ${completedCount} completed todos!`, 'success');
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(t => t.completed);
            case 'pending':
                return this.todos.filter(t => !t.completed);
            default:
                return this.todos;
        }
    }

    render() {
        this.updateStats();
        this.renderTodos();
        this.updateEmptyState();
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;

        this.totalCount.textContent = `Total: ${total}`;
        this.completedCount.textContent = `Completed: ${completed}`;
        this.pendingCount.textContent = `Pending: ${pending}`;
    }

    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        
        this.todoList.innerHTML = '';

        filteredTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);
            this.todoList.appendChild(todoElement);
        });
    }

    createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        const createdDate = new Date(todo.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        li.innerHTML = `
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                 onclick="todoApp.toggleTodo('${todo.id}')"></div>
            <span class="todo-text ${todo.completed ? 'completed' : ''}">
                ${this.escapeHtml(todo.text)}
            </span>
            <span class="todo-date">${createdDate}</span>
            <button class="delete-btn" 
                    onclick="todoApp.deleteTodo('${todo.id}')" 
                    title="Delete todo">
                🗑️
            </button>
        `;

        return li;
    }

    updateEmptyState() {
        const filteredTodos = this.getFilteredTodos();
        const isEmpty = filteredTodos.length === 0;
        
        this.emptyState.classList.toggle('hidden', !isEmpty);
        this.todoList.classList.toggle('hidden', isEmpty);

        if (isEmpty) {
            const emptyMessages = {
                all: { icon: '✨', title: 'No todos yet!', text: 'Add your first todo item above to get started.' },
                pending: { icon: '🎉', title: 'All done!', text: 'No pending todos. Great job!' },
                completed: { icon: '📝', title: 'No completed todos', text: 'Complete some todos to see them here.' }
            };

            const message = emptyMessages[this.currentFilter];
            this.emptyState.innerHTML = `
                <div class="empty-icon">${message.icon}</div>
                <h3>${message.title}</h3>
                <p>${message.text}</p>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#10b981' : 
                           type === 'warning' ? '#f59e0b' : 
                           type === 'error' ? '#ef4444' : '#6366f1'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    loadTodos() {
        try {
            const stored = localStorage.getItem('keen-todos');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load todos from localStorage:', error);
            return [];
        }
    }

    saveTodos() {
        try {
            localStorage.setItem('keen-todos', JSON.stringify(this.todos));
        } catch (error) {
            console.warn('Failed to save todos to localStorage:', error);
            this.showNotification('Failed to save todos!', 'error');
        }
    }
}

// Initialize the app
let todoApp;
document.addEventListener('DOMContentLoaded', () => {
    todoApp = new TodoApp();
    
    // Add some demo todos for first-time users
    if (todoApp.todos.length === 0) {
        const demoTodos = [
            {
                id: '1',
                text: 'Welcome to your TODO app! 🎉',
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                text: 'Click the checkbox to mark items as complete',
                completed: false,
                createdAt: new Date(Date.now() - 60000).toISOString()
            },
            {
                id: '3',
                text: 'This is a completed task example',
                completed: true,
                createdAt: new Date(Date.now() - 120000).toISOString()
            }
        ];
        
        todoApp.todos = demoTodos;
        todoApp.saveTodos();
        todoApp.render();
    }
});

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoApp;
}