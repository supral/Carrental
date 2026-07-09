export class RentalUnavailableError extends Error {
  constructor(message = "This vehicle has already been rented for the selected dates. Please choose another vehicle or different dates.") {
    super(message);
    this.name = "RentalUnavailableError";
  }
}
