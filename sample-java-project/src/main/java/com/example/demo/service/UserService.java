package com.example.demo.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.demo.repository.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository repository; // Anti-pattern: Field Injection

    public void deleteUser(String id) {
        System.out.println("Deleting user " + id); // Anti-pattern: Console Logging
        repository.delete(id); // Anti-pattern: Missing @Transactional
    }
}
