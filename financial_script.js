// Sistema de dados financeiros
let financialData = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let viewMonth = currentMonth;
let viewYear = currentYear;
let transactions = [];
let customCategories = [
    { name: 'ALIMENTAÇÃO', budget: 300, isDefault: true },
    { name: 'TRANSPORTE', budget: 200, isDefault: true },
    { name: 'MORADIA', budget: 500, isDefault: true },
    { name: 'SAÚDE', budget: 150, isDefault: true },
    { name: 'LAZER', budget: 200, isDefault: true },
    { name: 'EDUCAÇÃO', budget: 100, isDefault: true },
    { name: 'OUTROS', budget: 100, isDefault: true }
];
let charts = {};

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Inicializar sistema
function init() {
    loadData();
    ensureMonthExists(currentMonth, currentYear);
    updateCategorySelects();
    updateDisplay();
    setupEventListeners();
}

function getMonthKey(month, year) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function ensureMonthExists(month, year) {
    const key = getMonthKey(month, year);
    if (!financialData[key]) {
        financialData[key] = {
            month,
            year,
            income: 0,
            expenses: 0,
            balance: 0,
            categories: {}
        };
        
        // Inicializar categorias
        customCategories.forEach(cat => {
            financialData[key].categories[cat.name] = {
                budget: cat.budget,
                spent: 0
            };
        });
    }
}

function getCurrentMonthData() {
    const key = getMonthKey(currentMonth, currentYear);
    ensureMonthExists(currentMonth, currentYear);
    return financialData[key];
}

function getViewMonthData() {
    const key = getMonthKey(viewMonth, viewYear);
    ensureMonthExists(viewMonth, viewYear);
    return financialData[key];
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function switchTab(tabName) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adicionar classe active à aba clicada
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Atualizar conteúdo específico da aba
    if (tabName === 'analytics') {
        updateAnalytics();
    } else if (tabName === 'categories') {
        updateCategoriesTab();
    } else if (tabName === 'monthly') {
        updateMonthlyTab();
    } else if (tabName === 'transactions') {
        updateTransactionsHistory();
    }
}

function changeCurrentMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    ensureMonthExists(currentMonth, currentYear);
    updateDisplay();
    updateNavigationButtons();
}

function changeViewMonth(direction) {
    viewMonth += direction;
    if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    } else if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    }
    
    ensureMonthExists(viewMonth, viewYear);
    updateMonthlyTab();
}

function updateNavigationButtons() {
    const today = new Date();
    const currentDate = new Date(currentYear, currentMonth);
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 6); // 6 meses no futuro
    const minDate = new Date(today.getFullYear() - 2, 0); // 2 anos no passado
    
    document.getElementById('prevBtn').disabled = currentDate <= minDate;
    document.getElementById('nextBtn').disabled = currentDate >= maxDate;
}

function updateDisplay() {
    const data = getCurrentMonthData();
    
    document.getElementById('totalIncome').textContent = formatCurrency(data.income);
    document.getElementById('totalExpenses').textContent = formatCurrency(data.expenses);
    document.getElementById('balance').textContent = formatCurrency(data.balance);
    
    // Atualizar cor do saldo
    const balanceElement = document.getElementById('balance');
    balanceElement.style.color = data.balance >= 0 ? '#27ae60' : '#e74c3c';
    
    // Atualizar display do mês atual
    document.getElementById('currentMonthDisplay').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    // Verificar alertas
    updateAlerts(data.categories);
    
    // Atualizar categorias
    updateCategoryExpenses(data.categories);
    updateBudgetComparison(data.categories);
    updateNavigationButtons();
}

function updateAlerts(categories) {
    const alertsContainer = document.getElementById('alertsContainer');
    const alertCount = document.getElementById('alertCount');
    
    let alerts = [];
    
    Object.entries(categories).forEach(([category, data]) => {
        const percentage = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
        if (percentage > 100) {
            alerts.push(`${category}: ${percentage.toFixed(0)}% da meta (${formatCurrency(data.spent)})`);
        } else if (percentage > 80) {
            alerts.push(`${category}: ${percentage.toFixed(0)}% da meta - Atenção!`);
        }
    });
    
    alertCount.textContent = alerts.length;
    
    if (alerts.length > 0) {
        alertsContainer.innerHTML = alerts.map(alert => 
            `<div class="alert ${alert.includes('100%') ? 'danger' : ''}">${alert}</div>`
        ).join('');
    } else {
        alertsContainer.innerHTML = '<div class="alert success">Todas as metas estão sob controle!</div>';
    }
}

function updateCategoryExpenses(categories) {
    const container = document.getElementById('categoryExpenses');
    container.innerHTML = '';
    
    const sortedCategories = Object.entries(categories)
        .filter(([_, data]) => data.spent > 0)
        .sort(([_, a], [__, b]) => b.spent - a.spent);
    
    sortedCategories.forEach(([category, data]) => {
        const percentage = data.budget > 0 ? ((data.spent / data.budget) * 100).toFixed(0) : '0';
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <span class="category">${category}</span>
            <div>
                <span class="amount">${formatCurrency(data.spent)}</span>
                <small style="color: #7f8c8d; margin-left: 10px;">${percentage}% da meta</small>
            </div>
        `;
        container.appendChild(item);
    });
    
    if (sortedCategories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Nenhum gasto registrado neste mês.</p>';
    }
}

function updateBudgetComparison(categories) {
    const container = document.getElementById('budgetComparison');
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([category, data]) => {
        const percentage = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
        const item = document.createElement('div');
        item.className = 'budget-item';
        
        let progressClass = 'low';
        if (percentage > 100) progressClass = 'high';
        else if (percentage > 80) progressClass = 'high';
        else if (percentage > 60) progressClass = 'medium';
        
        item.innerHTML = `
            <div style="min-width: 120px; font-weight: 600; font-size: 0.9em;">${category}</div>
            <div class="progress">
                <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <div style="font-size: 0.9em; color: #666; min-width: 60px; text-align: right;">
                ${Math.round(percentage)}%<br>
                <small>${formatCurrency(data.spent)}/${formatCurrency(data.budget)}</small>
            </div>
        `;
        container.appendChild(item);
    });
}

function updateMonthlyTab() {
    const data = getViewMonthData();
    
    document.getElementById('monthlyIncome').textContent = formatCurrency(data.income);
    document.getElementById('monthlyExpenses').textContent = formatCurrency(data.expenses);
    document.getElementById('monthlyBalance').textContent = formatCurrency(data.balance);
    
    // Atualizar cor do saldo mensal
    const monthlyBalanceElement = document.getElementById('monthlyBalance');
    monthlyBalanceElement.style.color = data.balance >= 0 ? '#27ae60' : '#e74c3c';
    
    // Atualizar display do mês de visualização
    document.getElementById('viewMonthDisplay').textContent = 
        `${monthNames[viewMonth]} ${viewYear}`;
    
    updateMonthlyProgress(data.categories);
    createMonthlyChart();
}

function updateMonthlyProgress(categories) {
    const container = document.getElementById('monthlyProgress');
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([category, data]) => {
        const percentage = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
        const item = document.createElement('div');
        item.className = 'budget-item';
        
        let progressClass = 'low';
        if (percentage > 100) progressClass = 'high';
        else if (percentage > 80) progressClass = 'high';
        else if (percentage > 60) progressClass = 'medium';
        
        item.innerHTML = `
            <div style="min-width: 100px; font-weight: 600; font-size: 0.9em;">${category}</div>
            <div class="progress">
                <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <div style="font-size: 0.9em; color: #666; text-align: right;">
                ${Math.round(percentage)}%
            </div>
        `;
        container.appendChild(item);
    });
}

function createMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const data = getViewMonthData();
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }
    
    const categories = Object.entries(data.categories)
        .filter(([_, data]) => data.spent > 0)
        .sort(([_, a], [__, b]) => b.spent - a.spent);
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories.map(([cat, _]) => cat),
            datasets: [{
                label: 'Gasto',
                data: categories.map(([_, data]) => data.spent),
                backgroundColor: '#e74c3c'
            }, {
                label: 'Meta',
                data: categories.map(([_, data]) => data.budget),
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function addTransaction() {
    const category = document.getElementById('transactionCategory').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const type = document.getElementById('transactionType').value;
    
    if (!amount || amount <= 0) {
        alert('Por favor, insira um valor válido');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        category,
        amount,
        type,
        month: currentMonth,
        year: currentYear,
        date: new Date().toISOString()
    };
    
    transactions.push(transaction);
    
    // Atualizar dados do mês atual
    const currentData = getCurrentMonthData();
    if (type === 'income') {
        currentData.income += amount;
    } else {
        currentData.expenses += amount;
        if (currentData.categories[category]) {
            currentData.categories[category].spent += amount;
        }
    }
    currentData.balance = currentData.income - currentData.expenses;
    
    // Limpar formulário
    document.getElementById('transactionAmount').value = '';
    
    updateDisplay();
    updateTransactionsHistory();
    saveData();
    showAutoSaveIndicator();
}

function removeTransaction(transactionId) {
    const transactionIndex = transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) return;
    
    const transaction = transactions[transactionIndex];
    const monthKey = getMonthKey(transaction.month, transaction.year);
    const monthData = financialData[monthKey];
    
    if (monthData) {
        if (transaction.type === 'income') {
            monthData.income -= transaction.amount;
        } else {
            monthData.expenses -= transaction.amount;
            if (monthData.categories[transaction.category]) {
                monthData.categories[transaction.category].spent -= transaction.amount;
            }
        }
        monthData.balance = monthData.income - monthData.expenses;
    }
    
    transactions.splice(transactionIndex, 1);
    updateDisplay();
    updateTransactionsHistory();
    saveData();
    showAutoSaveIndicator();
}

function updateTransactionsHistory() {
    const tbody = document.getElementById('transactionsHistory');
    tbody.innerHTML = '';
    
    const currentMonthTransactions = transactions
        .filter(t => t.month === currentMonth && t.year === currentYear)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    currentMonthTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
            <td>${transaction.category}</td>
            <td>${transaction.type === 'income' ? 'Receita' : 'Despesa'}</td>
            <td style="color: ${transaction.type === 'income' ? '#27ae60' : '#e74c3c'}">
                ${formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="btn btn-danger btn-small" onclick="removeTransaction(${transaction.id})">Remover</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (currentMonthTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Nenhuma transação neste mês.</td></tr>';
    }
}

function updateCategoriesTab() {
    updateCategoriesList();
    updateBudgetSettings();
}

function updateCategoriesList() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';
    
    customCategories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <span class="name">${category.name}</span>
            <div>
                <span class="amount">Meta: ${formatCurrency(category.budget)}</span>
                ${!category.isDefault ? `<button class="btn btn-danger btn-small" onclick="removeCategory(${index})" style="margin-left: 10px;">Remover</button>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

function updateBudgetSettings() {
    const container = document.getElementById('budgetSettings');
    container.innerHTML = '';
    
    customCategories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'category-budget-item';
        item.innerHTML = `
            <span>${category.name}</span>
            <input type="number" step="0.01" value="${category.budget}" 
                   onchange="updateCategoryBudget(${index}, this.value)">
        `;
        container.appendChild(item);
    });
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim().toUpperCase();
    const budget = parseFloat(document.getElementById('newCategoryBudget').value);
    
    if (!name || !budget || budget <= 0) {
        alert('Por favor, insira um nome válido e um orçamento maior que zero.');
        return;
    }
    
    if (customCategories.some(cat => cat.name === name)) {
        alert('Categoria já existe!');
        return;
    }
    
    customCategories.push({
        name: name,
        budget: budget,
        isDefault: false
    });
    
    // Adicionar categoria a todos os meses existentes
    Object.keys(financialData).forEach(monthKey => {
        financialData[monthKey].categories[name] = {
            budget: budget,
            spent: 0
        };
    });
    
    updateCategorySelects();
    updateCategoriesTab();
    
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryBudget').value = '';
    
    saveData();
    showAutoSaveIndicator();
}

function removeCategory(index) {
    const category = customCategories[index];
    
    if (category.isDefault) {
        alert('Não é possível remover categorias padrão.');
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover a categoria "${category.name}"?`)) {
        // Remover de todos os meses
        Object.keys(financialData).forEach(monthKey => {
            delete financialData[monthKey].categories[category.name];
        });
        
        customCategories.splice(index, 1);
        updateCategorySelects();
        updateCategoriesTab();
        saveData();
        showAutoSaveIndicator();
    }
}

function updateCategoryBudget(index, newBudget) {
    const budget = parseFloat(newBudget);
    if (budget <= 0) return;
    
    customCategories[index].budget = budget;
    
    // Atualizar em todos os meses
    Object.keys(financialData).forEach(monthKey => {
        if (financialData[monthKey].categories[customCategories[index].name]) {
            financialData[monthKey].categories[customCategories[index].name].budget = budget;
        }
    });
    
    saveData();
    showAutoSaveIndicator();
}

function saveBudgets() {
    saveData();
    showAutoSaveIndicator();
    alert('Metas salvas com sucesso!');
}

function updateCategorySelects() {
    const select = document.getElementById('transactionCategory');
    select.innerHTML = '';
    
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function updateAnalytics() {
    updatePrediction();
    updateKPIs();
    createTrendChart();
    createPieChart();
}

function updatePrediction() {
    const monthKeys = Object.keys(financialData);
    if (monthKeys.length === 0) {
        document.getElementById('prediction').textContent = 'Adicione mais dados para gerar previsões.';
        return;
    }
    
    const avgExpenses = monthKeys.reduce((sum, key) => sum + financialData[key].expenses, 0) / monthKeys.length;
    const currentExpenses = getCurrentMonthData().expenses;
    const predictionElement = document.getElementById('prediction');
    
    let prediction = "";
    
    if (currentExpenses > avgExpenses * 1.2) {
        prediction = "Gastos 20% acima da média. Recomendo revisar as categorias com maior variação.";
    } else if (currentExpenses < avgExpenses * 0.8) {
        prediction = "Ótimo controle! Gastos 20% abaixo da média. Continue assim!";
    } else {
        prediction = "Gastos dentro da normalidade. Mantenha o foco nas categorias que mais oscilam.";
    }
    
    predictionElement.textContent = prediction;
}

function updateKPIs() {
    const monthKeys = Object.keys(financialData);
    if (monthKeys.length === 0) return;
    
    const avgExpense = monthKeys.reduce((sum, key) => sum + financialData[key].expenses, 0) / monthKeys.length;
    const currentData = getCurrentMonthData();
    const totalBudget = Object.values(currentData.categories).reduce((sum, cat) => sum + cat.budget, 0);
    const efficiency = totalBudget > 0 ? ((totalBudget - currentData.expenses) / totalBudget) * 100 : 0;
    const savingsRate = currentData.income > 0 ? (currentData.balance / currentData.income) * 100 : 0;
    
    document.getElementById('avgExpense').textContent = formatCurrency(avgExpense);
    document.getElementById('efficiencyRate').textContent = Math.max(0, efficiency).toFixed(1) + '%';
    document.getElementById('savingsRate').textContent = savingsRate.toFixed(1) + '%';
}

function createTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const monthKeys = Object.keys(financialData).sort();
    
    if (charts.trend) {
        charts.trend.destroy();
    }
    
    if (monthKeys.length === 0) {
        ctx.fillText('Sem dados para exibir', 10, 50);
        return;
    }
    
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthKeys.map(key => {
                const [year, month] = key.split('-');
                return `${monthNames[parseInt(month)]}/${year}`;
            }),
            datasets: [{
                label: 'Receita',
                data: monthKeys.map(key => financialData[key].income),
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                tension: 0.4
            }, {
                label: 'Gastos',
                data: monthKeys.map(key => financialData[key].expenses),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4
            }, {
                label: 'Saldo',
                data: monthKeys.map(key => financialData[key].balance),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function createPieChart() {
    const ctx = document.getElementById('pieChart').getContext('2d');
    const currentData = getCurrentMonthData();
    
    if (charts.pie) {
        charts.pie.destroy();
    }
    
    const categories = Object.entries(currentData.categories)
        .filter(([_, data]) => data.spent > 0)
        .sort(([_, a], [__, b]) => b.spent - a.spent);
    
    if (categories.length === 0) {
        ctx.fillText('Sem gastos para exibir', 10, 50);
        return;
    }
    
    charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(([cat, _]) => cat),
            datasets: [{
                data: categories.map(([_, data]) => data.spent),
                backgroundColor: [
                    '#e74c3c', '#3498db', '#f39c12', '#27ae60', '#9b59b6',
                    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    return {
                                        text: `${label}: ${formatCurrency(value)}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].backgroundColor[i],
                                        lineWidth: 0,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });
}

function saveData() {
    const dataToSave = {
        financialData: financialData,
        transactions: transactions,
        customCategories: customCategories,
        currentMonth: currentMonth,
        currentYear: currentYear,
        viewMonth: viewMonth,
        viewYear: viewYear,
        lastSaved: new Date().toISOString()
    };
    
    // Simular salvamento (não usar localStorage conforme instruções)
    console.log('Dados salvos:', dataToSave);
}

function loadData() {
    // Simular carregamento de dados
    console.log('Carregando dados...');
    
    // Inicializar com dados padrão se necessário
    if (Object.keys(financialData).length === 0) {
        ensureMonthExists(currentMonth, currentYear);
    }
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function setupEventListeners() {
    // Auto-save a cada 30 segundos
    setInterval(() => {
        saveData();
    }, 30000);
    
    // Salvar dados ao sair da página
    window.addEventListener('beforeunload', () => {
        saveData();
    });
}

// Inicializar quando a página carregar
window.addEventListener('load', init);