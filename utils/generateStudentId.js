import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

export const generateStudentId = async () => {
  const counterRef = doc(db, "counters", "studentCounter");

  const newId = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    if (!counterDoc.exists()) {
      throw "Counter document does not exist!";
    }

    const currentId = counterDoc.data().currentId;

    const nextId = currentId + 1;

    transaction.update(counterRef, {
      currentId: nextId,
    });

    return nextId;
  });

  return "ST" + newId;
};
