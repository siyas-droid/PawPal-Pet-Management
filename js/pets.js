
const petForm = document.getElementById('petForm');
const petList = document.getElementById('petList');
const petMessage = document.getElementById('petMessage');
const editPetPanel = document.getElementById('editPetPanel');
const editPetForm = document.getElementById('editPetForm');
const editMessage = document.getElementById('editMessage');
const cancelEditButton = document.getElementById('cancelEditButton');

const user = JSON.parse(sessionStorage.getItem('pawpalUser') || 'null');
const API = '/api';

if (!user || !user.user_id) {
    window.location.href = 'login.html';
}

function showMessage(element, message, success = false) {
    element.textContent = message;
    element.style.color = success ? 'green' : 'red';
}

async function loadPets() {
    try {
        const response = await fetch(`${API}/pets/${user.user_id}`);
        const data = await response.json();

        if (!data.success) {
            petList.textContent = data.message;
            return;
        }

        petList.replaceChildren();

        if (!data.pets.length) {
            petList.textContent = 'No pets added yet. Add your first pet! 🐶';
            return;
        }

        data.pets.forEach(pet => {
            const card = document.createElement('div');
            card.className = 'pet-card';

            const photo = document.createElement('img');
            photo.src = pet.photo
                ? `${pet.photo}`
                : 'https://placehold.co/160x160?text=No+Photo';
            Object.assign(photo.style, {
                width: '160px',
                height: '160px',
                objectFit: 'cover',
                borderRadius: '12px',
                display: 'block',
                marginBottom: '12px'
            });
            photo.alt = pet.pet_name;

            const details = document.createElement('div');
            details.innerHTML = '';

            const name = document.createElement('h3');
            name.textContent = '🐾 ' + pet.pet_name;

            card.append(photo, name);

            [
                `Species: ${pet.species}`,
                `Breed: ${pet.breed || 'Not specified'}`,
                `Age: ${pet.age == null ? 'Not specified' : pet.age + ' years'}`,
                `Gender: ${pet.gender || 'Not specified'}`
            ].forEach(value => {
                const p = document.createElement('p');
                p.textContent = value;
                card.appendChild(p);
            });

            const photoInput = document.createElement('input');
            photoInput.type = 'file';
            photoInput.accept = 'image/jpeg,image/png,image/webp';
            photoInput.hidden = true;

            const photoButton = document.createElement('button');
            photoButton.type = 'button';
            photoButton.textContent = pet.photo ? 'Change Photo 📷' : 'Upload Photo 📷';
            photoButton.onclick = () => photoInput.click();

            photoInput.onchange = async () => {
                if (photoInput.files[0]) {
                    await uploadPetPhoto(pet.pet_id, photoInput.files[0]);
                    photoInput.value = '';
                }
            };

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.textContent = 'Edit Pet ✏️';
            editButton.style.background = '#A66BBE';
            editButton.onclick = () => editPet(pet);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.textContent = 'Delete Pet';
            deleteButton.onclick = () => deletePet(pet.pet_id);

            card.append(photoButton, photoInput, editButton, deleteButton);
            petList.appendChild(card);
        });

    } catch (error) {
        petList.textContent = 'Unable to connect to PawPal server.';
    }
}

async function uploadPetPhoto(petId, file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowed.includes(file.type)) {
        return showMessage(petMessage, 'Please select a JPG, PNG or WEBP image.');
    }

    if (file.size > 5 * 1024 * 1024) {
        return showMessage(petMessage, 'Photo must be smaller than 5 MB.');
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('user_id', user.user_id);

    try {
        const response = await fetch(`${API}/pets/${petId}/photo`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        showMessage(petMessage, data.message, response.ok && data.success);

        if (response.ok && data.success) await loadPets();
    } catch {
        showMessage(petMessage, 'Unable to upload pet photo.');
    }
}

petForm.addEventListener('submit', async event => {
    event.preventDefault();

    const photo = document.getElementById('photo').files[0];
    const petData = {
        user_id: user.user_id,
        pet_name: document.getElementById('pet_name').value,
        species: document.getElementById('species').value,
        breed: document.getElementById('breed').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value
    };

    try {
        const response = await fetch(`${API}/pets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(petData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            return showMessage(petMessage, data.message || 'Unable to add pet.');
        }

        if (photo) {
            await uploadPetPhoto(data.pet_id, photo);
        }

        showMessage(petMessage, 'Pet added successfully! 🐾', true);
        petForm.reset();
        await loadPets();

    } catch {
        showMessage(petMessage, 'Unable to connect to PawPal server.');
    }
});

function editPet(pet) {
    editPetPanel.hidden = false;

    document.getElementById('edit_pet_id').value = pet.pet_id;
    document.getElementById('edit_pet_name').value = pet.pet_name;
    document.getElementById('edit_species').value = pet.species;
    document.getElementById('edit_breed').value = pet.breed || '';
    document.getElementById('edit_age').value = pet.age ?? '';
    document.getElementById('edit_gender').value = pet.gender || '';

    editMessage.textContent = '';
    editPetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

editPetForm.addEventListener('submit', async event => {
    event.preventDefault();

    const petId = document.getElementById('edit_pet_id').value;
    const updatedPet = {
        user_id: user.user_id,
        pet_name: document.getElementById('edit_pet_name').value,
        species: document.getElementById('edit_species').value,
        breed: document.getElementById('edit_breed').value,
        age: document.getElementById('edit_age').value,
        gender: document.getElementById('edit_gender').value
    };

    try {
        const response = await fetch(`${API}/pets/${petId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPet)
        });

        const data = await response.json();
        showMessage(editMessage, data.message, response.ok && data.success);

        if (response.ok && data.success) {
            await loadPets();
            editPetPanel.hidden = true;
            editPetForm.reset();
        }
    } catch {
        showMessage(editMessage, 'Unable to update pet.');
    }
});

cancelEditButton.addEventListener('click', () => {
    editPetPanel.hidden = true;
    editPetForm.reset();
    editMessage.textContent = '';
});

async function deletePet(petId) {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
        const response = await fetch(`${API}/pets/${petId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id })
        });

        const data = await response.json();
        showMessage(petMessage, data.message, response.ok && data.success);

        if (response.ok && data.success) await loadPets();
    } catch {
        showMessage(petMessage, 'Unable to connect to PawPal server.');
    }
}

loadPets();
