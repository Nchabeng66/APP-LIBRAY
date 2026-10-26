import { hasNoDigits, isDigitsOnly, isValidIsbn, isValidUrl } from './helpers.js';

export function validateBookForm(data, books, excludeId = null) {
  const errors = {};

  if (!data.title.trim()) errors.title = 'Title is required.';
  else if (!hasNoDigits(data.title)) errors.title = 'Title cannot contain numbers.';

  if (!data.author.trim()) errors.author = 'Author is required.';
  else if (!hasNoDigits(data.author)) errors.author = 'Author cannot contain numbers.';

  if (!data.genre.trim()) errors.genre = 'Genre is required.';

  if (!data.isbn.trim()) errors.isbn = 'ISBN is required.';
  else if (!isValidIsbn(data.isbn)) errors.isbn = 'Enter a valid ISBN-10 or ISBN-13.';
  else if (books.some((b) => b.isbn === data.isbn.trim() && b.id !== excludeId))
    errors.isbn = 'A book with this ISBN already exists.';

  if (data.quantity === '' || Number.isNaN(Number(data.quantity)))
    errors.quantity = 'Enter a starting quantity.';
  else if (Number(data.quantity) < 0 || !Number.isInteger(Number(data.quantity)))
    errors.quantity = 'Quantity must be a whole number, 0 or more.';

  if (data.price !== '' && (Number.isNaN(Number(data.price)) || Number(data.price) < 0))
    errors.price = 'Price must be 0 or more (leave blank for free).';

  return errors;
}

export function validateOnlineBookForm(data) {
  const errors = {};

  if (!data.title.trim()) errors.title = 'Title is required.';
  else if (!hasNoDigits(data.title)) errors.title = 'Title cannot contain numbers.';

  if (!data.author.trim()) errors.author = 'Author is required.';
  else if (!hasNoDigits(data.author)) errors.author = 'Author cannot contain numbers.';

  if (!data.genre.trim()) errors.genre = 'Genre is required.';

  if (!data.url.trim()) errors.url = 'Paste a link to the book.';
  else if (!isValidUrl(data.url)) errors.url = 'Enter a valid http(s) link.';

  return errors;
}

export function validateSignupForm(data, users) {
  const errors = {};

  if (!data.name.trim()) errors.name = 'Full name is required.';
  else if (!hasNoDigits(data.name)) errors.name = 'Name cannot contain numbers.';

  if (!data.idNumber.trim()) errors.idNumber = 'ID number is required.';
  else if (!isDigitsOnly(data.idNumber))
    errors.idNumber = 'ID number must contain numbers only.';
  else if (users.some((u) => u.idNumber === data.idNumber.trim()))
    errors.idNumber = 'An account with this ID number already exists.';

  if (data.age === '' || Number.isNaN(Number(data.age)) || Number(data.age) < 0)
    errors.age = 'Enter a valid age.';

  if (!data.address.trim()) errors.address = 'Home address is required.';

  if (!data.password) errors.password = 'Choose a password.';
  else if (data.password.length < 4) errors.password = 'Use at least 4 characters.';

  if (data.password !== data.confirm) errors.confirm = 'Passwords do not match.';

  return errors;
}

export function validateUserForm(data, users, editingUserId = null) {
  const errors = {};

  if (!data.name.trim()) errors.name = 'Name is required.';
  else if (!hasNoDigits(data.name)) errors.name = 'Name cannot contain numbers.';

  if (!data.idNumber.trim()) errors.idNumber = 'ID number is required.';
  else if (!isDigitsOnly(data.idNumber))
    errors.idNumber = 'ID number must contain numbers only.';
  else if (users.some((u) => u.idNumber === data.idNumber.trim() && u.id !== editingUserId))
    errors.idNumber = 'That ID number is already registered.';

  if (!editingUserId && !data.password)
    errors.password = 'Set a password so this user can log in.';

  return errors;
}