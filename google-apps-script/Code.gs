const SHEET_NAME = 'Todos';
const HEADERS = ['id', 'createdAt', 'item', 'dueDate', 'description', 'done'];

function doGet(event) {
  const params = event.parameter || {};
  const callback = params.callback || 'callback';

  try {
    assertAuthorized(params.password);
    const result = handleAction(params);
    return jsonp(callback, Object.assign({ ok: true }, result));
  } catch (error) {
    return jsonp(callback, {
      ok: false,
      message: error.message || '요청 처리에 실패했습니다.',
    });
  }
}

function handleAction(params) {
  const action = params.action || 'list';

  if (action === 'list') {
    return { todos: listTodos() };
  }

  if (action === 'add') {
    addTodo({
      id: Utilities.getUuid(),
      createdAt: cleanDate(params.createdAt),
      item: requireText(params.item, '항목을 입력해야 합니다.'),
      dueDate: cleanDate(params.dueDate),
      description: params.description || '',
      done: false,
    });
    return { todos: listTodos() };
  }

  if (action === 'update') {
    updateTodo(params.id, { done: params.done === 'true' });
    return { todos: listTodos() };
  }

  if (action === 'delete') {
    deleteTodo(params.id);
    return { todos: listTodos() };
  }

  if (action === 'clearDone') {
    clearDoneTodos();
    return { todos: listTodos() };
  }

  throw new Error('지원하지 않는 요청입니다.');
}

function assertAuthorized(password) {
  const savedPassword = PropertiesService.getScriptProperties().getProperty('TODO_PASSWORD');
  if (!savedPassword) {
    throw new Error('Apps Script의 TODO_PASSWORD 속성을 설정해야 합니다.');
  }
  if (password !== savedPassword) {
    throw new Error('비밀번호가 올바르지 않습니다.');
  }
}

function getSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => currentHeaders[index] !== header);

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function listTodos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .filter(function(row) {
      return row[0];
    })
    .map(function(row) {
      return {
        id: String(row[0] || ''),
        createdAt: stringifyDate(row[1]),
        item: String(row[2] || ''),
        dueDate: stringifyDate(row[3]),
        description: String(row[4] || ''),
        done: row[5] === true || String(row[5]).toLowerCase() === 'true',
      };
    });
}

function addTodo(todo) {
  const sheet = getSheet();
  sheet.appendRow([
    todo.id,
    todo.createdAt,
    todo.item,
    todo.dueDate,
    todo.description,
    todo.done,
  ]);
}

function updateTodo(id, updates) {
  const rowNumber = findRowNumber(id);
  const sheet = getSheet();

  if (typeof updates.done === 'boolean') {
    sheet.getRange(rowNumber, 6).setValue(updates.done);
  }
}

function deleteTodo(id) {
  const rowNumber = findRowNumber(id);
  getSheet().deleteRow(rowNumber);
}

function clearDoneTodos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  for (let rowNumber = lastRow; rowNumber >= 2; rowNumber -= 1) {
    const done = sheet.getRange(rowNumber, 6).getValue();
    if (done === true || String(done).toLowerCase() === 'true') {
      sheet.deleteRow(rowNumber);
    }
  }
}

function findRowNumber(id) {
  const cleanId = requireText(id, '항목 id가 없습니다.');
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error('항목을 찾을 수 없습니다.');
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const index = ids.findIndex(function(row) {
    return String(row[0]) === cleanId;
  });

  if (index === -1) {
    throw new Error('항목을 찾을 수 없습니다.');
  }

  return index + 2;
}

function requireText(value, message) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error(message);
  }
  return text;
}

function cleanDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function stringifyDate(value) {
  if (!value) {
    return '';
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function jsonp(callback, data) {
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)
    ? callback
    : 'callback';
  const output = safeCallback + '(' + JSON.stringify(data) + ');';
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
