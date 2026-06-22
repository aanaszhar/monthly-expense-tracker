$(document).ready(function() {

    const COLORS = {
        'Housing': '#ff6384',
        'Utilities': '#36a2eb',
        'Food & Dining': '#ffce56',
        'Transportation': '#4bc0c0',
        'Healthcare': '#9966ff',
        'Entertainment & Subscription': '#ff9f40',
        'Debt Repayment': '#c9cbcf',
        'Personal Care': '#8ac926'
    };
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ALLOWED_YEARS = ['2026', '2025'];
    
    const $yearFilter = $('#yearFilter');
    const $chartContainer = $('#chartContainer');
    const $expenseList = $('#expenseList');
    const $typeFilterContainer = $('#typeFilterContainer');
    const $typeFilterDropdown = $('#typeFilterDropdown');
    const $formCard = $('#expenseFormCard');
    const $form = $('#expenseForm');
    const $tooltip = $('#chartTooltip');

    let expenses = [];
    let maxMonthlyLimit = parseFloat(localStorage.getItem('myMaxExpense')) || 0;
    let activeMonthFilter = null; 
    let pieChartInstance = null; 
    let searchQuery = ""; 


    function init() {
        if (localStorage.getItem('myTheme') === 'light') {
            $('body').addClass('light-mode');
        }

        if (maxMonthlyLimit) {
            $('#maxExpenseInput').val(maxMonthlyLimit);
        }

        let savedData = localStorage.getItem('myExpenses_v6'); 
        if (savedData) {
            expenses = JSON.parse(savedData);
        } else {
            expenses = typeof defaultExpensesData !== 'undefined' ? defaultExpensesData : [];
            saveData();
        }

        buildCategoryFilters();
        updateScreen();
    }

    function saveData() {
        localStorage.setItem('myExpenses_v6', JSON.stringify(expenses));
    }


    $yearFilter.change(() => { activeMonthFilter = null; updateScreen(); });
    $('#sortFilter').change(() => updateScreen());
    $('#searchInput').on('input', function() {
        searchQuery = $(this).val().toLowerCase();
        updateScreen(); 
    });

    $(document).on('click', '.chart-col', function() {
        let clickedMonth = $(this).data('month');
        activeMonthFilter = (activeMonthFilter === clickedMonth) ? null : clickedMonth;
        updateScreen();
    });

    $('#themeToggleBtn').click(() => {
        $('body').toggleClass('light-mode');
        localStorage.setItem('myTheme', $('body').hasClass('light-mode') ? 'light' : 'dark');
        updateScreen();
    });

    $('#saveLimitBtn').click(() => {
        maxMonthlyLimit = parseFloat($('#maxExpenseInput').val()) || 0;
        localStorage.setItem('myMaxExpense', maxMonthlyLimit);
        updateScreen(); 
        alert(maxMonthlyLimit > 0 ? `Maximum limit set to RM ${maxMonthlyLimit.toFixed(2)}` : "Maximum limit removed.");
    });

    $('#exportCsvBtn').click(() => {
        if (expenses.length === 0) return alert("No data available to export.");
        
        let csvContent = "ID,Title,Amount (RM),Date,Type,Notes\n";
        expenses.forEach(exp => {
            let safeTitle = exp.title.replace(/"/g, '""'); 
            let safeNotes = exp.notes ? exp.notes.replace(/"/g, '""') : "";
            csvContent += `${exp.id},"${safeTitle}",${exp.amount},${exp.date},"${exp.type}","${safeNotes}"\n`;
        });

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "expenses.csv";
        link.click();
    });

    $('#clearDataBtn').click(() => {
        if (prompt("Type 'DELETE' to confirm:") === "DELETE") {
            expenses = [];
            saveData();
            updateScreen();
            alert("Data cleared.");
        }
    });

    $('#toggleFormBtn').click(() => { closeForm(); $formCard.slideToggle(); });
    $('#cancelBtn').click(() => closeForm());

    $form.submit(function(e) {
        e.preventDefault();
        
        let isValid = true;
        let id = $('#editId').val();
        let title = $('#titleInput').val().trim();
        let amount = parseFloat($('#amountInput').val());
        let date = $('#dateInput').val();
        let type = $('#typeInput').val();
        let notes = $('#notesInput').val().trim();

        // Validation
        $('#titleInput').toggleClass('is-invalid', !title);
        $('#amountInput').toggleClass('is-invalid', isNaN(amount) || amount <= 0);
        $('#dateInput').toggleClass('is-invalid', !date);
        $('#typeInput').toggleClass('is-invalid', !type);

        if (!title || isNaN(amount) || amount <= 0 || !date || !type) return;

        let expenseObj = { id: id || Date.now(), title, amount, date, type, notes };

        if (id) {
            let index = expenses.findIndex(exp => exp.id == id);
            if (index !== -1) expenses[index] = expenseObj;
        } else {
            expenses.push(expenseObj);
        }

        saveData();
        closeForm();
        
        activeMonthFilter = parseInt(date.substring(5, 7)) - 1; 
        $yearFilter.val(date.substring(0, 4));
        updateScreen();
    });

    $(document).on('click', '.edit-btn', function() {
        let exp = expenses.find(e => e.id == $(this).data('id'));
        if (exp) {
            closeForm(); 
            $('#editId').val(exp.id);
            $('#titleInput').val(exp.title);
            $('#amountInput').val(exp.amount);
            $('#dateInput').val(exp.date);
            $('#typeInput').val(exp.type);
            $('#notesInput').val(exp.notes);

            $('#submitBtn').text('Update Expense');
            $formCard.slideDown();
            $('html, body').animate({ scrollTop: 0 }, 'fast');
        }
    });

    $(document).on('click', '.delete-btn', function() {
        if(confirm("Delete this expense?")) {
            expenses = expenses.filter(exp => exp.id != $(this).data('id'));
            saveData(); 
            updateScreen();
        }
    });

    $(document).on('change', '#selectAllTypes', function() {
        $('.type-checkbox').prop('checked', $(this).is(':checked'));
        updateDropdownLabel();
        updateScreen();
    });

    $(document).on('change', '.type-checkbox', function() {
        let allChecked = $('.type-checkbox:checked').length === $('.type-checkbox').length;
        $('#selectAllTypes').prop('checked', allChecked);
        updateDropdownLabel();
        updateScreen();
    });

    $(document).on('mouseenter', '.chart-col', function() {
        $tooltip.text('RM ' + $(this).data('total')).show();
    }).on('mousemove', '.chart-col', function(e) {
        $tooltip.css({ top: e.pageY - 40 + 'px', left: e.pageX + 15 + 'px' });
    }).on('mouseleave', '.chart-col', function() {
        $tooltip.hide();
    });

    
    function closeForm() {
        $formCard.slideUp(); 
        $form[0].reset(); 
        $('#editId').val(''); 
        $('#submitBtn').text('Save Expense'); 
        $('.is-invalid').removeClass('is-invalid'); 
    }

    function buildCategoryFilters() {
        let html = `
            <li>
                <div class="form-check m-1 ms-2">
                    <input class="form-check-input" type="checkbox" id="selectAllTypes" checked>
                    <label class="form-check-label fw-bold" for="selectAllTypes">All Categories</label>
                </div>
            </li>
            <li><hr class="dropdown-divider"></li>
        `;
        Object.keys(COLORS).forEach(type => {
            let cleanId = 'filter-' + type.replace(/[^a-zA-Z0-9]/g, '');
            html += `
                <li>
                    <div class="form-check m-1 ms-2">
                        <input class="form-check-input type-checkbox" type="checkbox" id="${cleanId}" value="${type}" checked>
                        <label class="form-check-label" for="${cleanId}">${type}</label>
                    </div>
                </li>
            `;
        });
        $typeFilterContainer.html(html);
    }

    function updateDropdownLabel() {
        let checked = $('.type-checkbox:checked').length;
        let total = $('.type-checkbox').length;
        
        let label = checked === 0 ? "Filter: None Selected" : 
                    checked === total ? "Filter: All Categories" : 
                    checked === 1 ? "Filter: " + $('.type-checkbox:checked').val() : 
                    `Filter: ${checked} Categories`;
                    
        $typeFilterDropdown.text(label);
    }

    function updateScreen() {
        let currentChoice = $yearFilter.val() || '2026';
        $yearFilter.empty();
        ALLOWED_YEARS.forEach(y => $yearFilter.append(`<option value="${y}">${y}</option>`));
        $yearFilter.val(currentChoice);

        let filtered = expenses.filter(exp => exp.date.substring(0, 4) === currentChoice);
        
        let checkedTypes = $('.type-checkbox:checked').map(function() { return this.value; }).get();
        filtered = filtered.filter(exp => checkedTypes.includes(exp.type));

        let listFiltered = filtered;
        
        if (activeMonthFilter !== null) {
            listFiltered = filtered.filter(exp => parseInt(exp.date.substring(5, 7)) - 1 === activeMonthFilter);
        }

        if (searchQuery) {
            listFiltered = listFiltered.filter(exp => 
                exp.title.toLowerCase().includes(searchQuery) || 
                (exp.notes && exp.notes.toLowerCase().includes(searchQuery))
            );
        }

        renderDiagram(filtered); 
        renderList(listFiltered);    
        renderPieChart(listFiltered, activeMonthFilter !== null);
    }

    function renderDiagram(data) {
        let monthlyTotals = new Array(12).fill(0);
        data.forEach(exp => monthlyTotals[parseInt(exp.date.substring(5, 7)) - 1] += exp.amount);
        let maxAmount = Math.max(...monthlyTotals);

        $chartContainer.empty().toggleClass('has-selection', activeMonthFilter !== null);
        
        MONTHS.forEach((monthName, i) => {
            let fill = maxAmount > 0 ? Math.round((monthlyTotals[i] / maxAmount) * 100) + '%' : '0%';
            let barCls = 'chart-bar-fill' + (maxMonthlyLimit > 0 && monthlyTotals[i] > maxMonthlyLimit ? ' over-budget' : '');
            let colCls = 'chart-col' + (activeMonthFilter === i ? ' selected' : '');

            $chartContainer.append(`
                <div class="${colCls}" data-month="${i}" data-total="${monthlyTotals[i].toFixed(2)}">
                    <div class="chart-bar-bg"><div class="${barCls}" style="height: ${fill}"></div></div>
                    <div class="chart-label">${monthName}</div>
                </div>
            `);
        });
    }

    function renderList(data) {
        $expenseList.empty();

        if (data.length === 0) {
            let msg = "Found no expenses.";
            if ($('.type-checkbox:checked').length === 0) msg = "Please select at least one category.";
            else if (searchQuery) msg = "No expenses match your search.";
            else if (activeMonthFilter !== null) msg = "Found no expenses for this month in the selected categories.";
            
            return $expenseList.append(`<div class="empty-msg mt-4">${msg}</div>`);
        }

        let sort = $('#sortFilter').val();
        data.sort((a, b) => {
            if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
            return sort === 'amount-desc' ? b.amount - a.amount : a.amount - b.amount;
        });

        data.forEach(exp => {
            let [y, m, d] = exp.date.split('-');
            let notesHtml = exp.notes ? `<div class="expense-notes">${exp.notes}</div>` : '';
            let style = `background-color: ${COLORS[exp.type] || '#93c5fd'}; color: #1a1a1a;`;

            $expenseList.append(`
                <div class="expense-item">
                    <div class="expense-date">
                        <div class="expense-date-month">${MONTHS[parseInt(m)-1]}</div>
                        <div class="expense-date-year">${y}</div>
                        <div class="expense-date-day">${d}</div>
                    </div>
                    <div class="expense-details">
                        <div class="expense-title">${exp.title}</div>
                        <div class="expense-type" style="${style}">${exp.type}</div>
                        ${notesHtml}
                    </div>
                    <div class="expense-amount">RM ${exp.amount.toFixed(2)}</div>
                    <div class="action-buttons">
                        <button class="edit-btn" data-id="${exp.id}" title="Edit">✎</button>
                        <button class="delete-btn" data-id="${exp.id}" title="Delete">✖</button>
                    </div>
                </div>
            `);
        });
    }

    function renderPieChart(data, isMonthSelected) {
        let $canvas = $('#typePieChart');
        let $placeholder = $('#pieChartPlaceholder');

        if (!isMonthSelected || data.length === 0) {
            $canvas.hide();
            $placeholder.text(!isMonthSelected ? 'Select a month from the bar chart to view its breakdown.' : 'No expenses recorded for this view.').show();
            return;
        }

        $placeholder.hide();
        $canvas.show();

        let typeTotals = {};
        let total = 0;
        data.forEach(exp => { typeTotals[exp.type] = (typeTotals[exp.type] || 0) + exp.amount; total += exp.amount; });

        let labels = [], values = [], colors = [];
        for (let type in typeTotals) {
            labels.push(`${type} (${((typeTotals[type] / total) * 100).toFixed(1)}%)`);
            values.push(typeTotals[type]);
            colors.push(COLORS[type] || '#93c5fd'); 
        }

        if (pieChartInstance) pieChartInstance.destroy();

        let isLight = $('body').hasClass('light-mode');
        pieChartInstance = new Chart(document.getElementById('typePieChart').getContext('2d'), {
            type: 'pie',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: isLight ? '#ffffff' : '#2a2a2a' }] },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: isLight ? '#333' : 'white', font: { size: 12 }, padding: 15 } },
                    tooltip: { callbacks: { label: ctx => ` RM ${ctx.raw.toFixed(2)}` } }
                }
            }
        });
    }

    init();
});