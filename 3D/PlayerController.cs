using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public class PlayerController : MonoBehaviour
{
    private NavMeshAgent agent;
    private float velocity;
    private Vector3 direction;
    private Animator anim;

    void Start()
    {
        anim = GetComponent<Animator>();
        agent = GetComponent<NavMeshAgent>();
        direction = transform.position;
    }

    void Update()
    {
        velocity = ((transform.position - direction).magnitude) / Time.deltaTime;
        direction = transform.position;

        if (Input.GetMouseButtonDown(0))
        {
            Ray screenRay = Camera.main.ScreenPointToRay(Input.mousePosition);
            RaycastHit hit;
            if (Physics.Raycast(screenRay, out hit))
            {
                agent.SetDestination(hit.point);
            }
        }

        anim.SetFloat("characterSpeed", velocity);
    }
}
